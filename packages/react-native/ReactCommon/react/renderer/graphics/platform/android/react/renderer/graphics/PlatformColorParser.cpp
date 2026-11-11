/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <react/renderer/graphics/PlatformColorParser.h>

#include <fbjni/NativeRunnable.h>
#include <fbjni/fbjni.h>
#include <folly/container/EvictingCacheMap.h>
#include <react/renderer/css/CSSColor.h>
#include <react/renderer/css/CSSValueParser.h>
#include <functional>
#include <mutex>
#include <optional>
#include <unordered_map>

namespace facebook::react {

namespace {

void configurePlatformColorCacheInvalidationHook(std::function<void()>&& hook) {
  auto appearanceModuleClass = jni::findClassLocal(
      "com/facebook/react/modules/appearance/AppearanceModule");
  if (appearanceModuleClass) {
    auto callbackField =
        appearanceModuleClass->getStaticField<jni::JRunnable::javaobject>(
            "invalidatePlatformColorCache");
    jni::local_ref<jni::JRunnable> invalidationCallback =
        jni::JNativeRunnable::newObjectCxxArgs(std::move(hook));
    appearanceModuleClass->setStaticFieldValue(
        callbackField, invalidationCallback.get());
  }
}

size_t hashGetColourArguments(
    int32_t surfaceId,
    const std::vector<std::string>& resourcePaths) {
  size_t seed = std::hash<int32_t>{}(surfaceId);
  for (const auto& path : resourcePaths) {
    seed ^=
        std::hash<std::string>{}(path) + 0x9e3779b9 + (seed << 6) + (seed >> 2);
  }
  return seed;
}

// Caches of the (costly) JNI results. A cached nullopt is an explicit miss,
// distinct from a path that resolves to transparent (ARGB 0).
constinit std::mutex getColorCacheMutex;
folly::EvictingCacheMap<size_t, std::optional<Color>>& getColorCache() {
  static folly::EvictingCacheMap<size_t, std::optional<Color>> cache(64);
  return cache;
}

// Appearance flags per surface, so a DynamicColor does not make a JNI call
constinit std::mutex appearanceCacheMutex;
folly::EvictingCacheMap<int32_t, jint>& appearanceCache() {
  static folly::EvictingCacheMap<int32_t, jint> cache(16);
  return cache;
}

// Clears both caches when the color scheme changes
void setUpCacheInvalidation() {
  static constinit std::once_flag setupCacheInvalidation;
  std::call_once(
      setupCacheInvalidation, configurePlatformColorCacheInvalidationHook, [] {
        {
          std::scoped_lock lock(getColorCacheMutex);
          getColorCache().clear();
        }
        std::scoped_lock lock(appearanceCacheMutex);
        appearanceCache().clear();
      });
}

// Must match the flags returned by FabricUIManager.getAppearance
constexpr jint kAppearanceDark = 1 << 0;
constexpr jint kAppearanceHighContrast = 1 << 1;

jint getAppearance(
    const ContextContainer& contextContainer,
    int32_t surfaceId) {
  setUpCacheInvalidation();

  std::scoped_lock lock(appearanceCacheMutex);
  auto iterator = appearanceCache().find(surfaceId);
  if (iterator != appearanceCache().end()) {
    return iterator->second;
  }

  auto fabricUIManager =
      contextContainer.at<jni::alias_ref<jobject>>("FabricUIManager");
  static auto getAppearanceFromJava =
      fabricUIManager->getClass()->getMethod<jint(jint)>("getAppearance");
  auto appearance = getAppearanceFromJava(fabricUIManager, surfaceId);
  appearanceCache().set(surfaceId, appearance);
  return appearance;
}

// Picks the variant of a DynamicColor that matches the current appearance of
// the surface. The color is resolved once: views keep it until their props are
// parsed again.
SharedColor parseDynamicColor(
    const ContextContainer& contextContainer,
    int32_t surfaceId,
    const std::unordered_map<std::string, RawValue>& items) {
  auto appearance = getAppearance(contextContainer, surfaceId);
  bool isDark = (appearance & kAppearanceDark) != 0;
  bool isHighContrast = (appearance & kAppearanceHighContrast) != 0;

  auto variant = items.end();
  if (isHighContrast) {
    variant = items.find(isDark ? "highContrastDark" : "highContrastLight");
  }
  if (variant == items.end() || !variant->second.hasValue()) {
    variant = items.find(isDark ? "dark" : "light");
  }

  SharedColor color{};
  if (variant != items.end() && variant->second.hasValue()) {
    fromRawValue(contextContainer, surfaceId, variant->second, color);
  }
  return color;
}

} // namespace

SharedColor parsePlatformColor(
    const ContextContainer& contextContainer,
    int32_t surfaceId,
    const RawValue& value) {
  Color color{};
  if (value.hasType<std::unordered_map<std::string, RawValue>>()) {
    // Mixed array + string values, so read as a map of RawValue (a map of
    // vector<string> would assert on the fallback string).
    auto map = (std::unordered_map<std::string, RawValue>)value;

    auto dynamicIt = map.find("dynamic");
    if (dynamicIt != map.end() &&
        dynamicIt->second
            .hasType<std::unordered_map<std::string, RawValue>>()) {
      return parseDynamicColor(
          contextContainer,
          surfaceId,
          (std::unordered_map<std::string, RawValue>)dynamicIt->second);
    }

    std::vector<std::string> resourcePaths;
    auto resourcePathsIt = map.find("resource_paths");
    if (resourcePathsIt != map.end() &&
        resourcePathsIt->second.hasType<std::vector<std::string>>()) {
      resourcePaths = (std::vector<std::string>)resourcePathsIt->second;
    }

    bool resolved = false;
    if (!resourcePaths.empty()) {
      setUpCacheInvalidation();

      auto hash = hashGetColourArguments(surfaceId, resourcePaths);
      std::optional<Color> resolvedColor;
      {
        std::scoped_lock lock(getColorCacheMutex);
        auto iterator = getColorCache().find(hash);
        if (iterator != getColorCache().end()) {
          resolvedColor = iterator->second;
        } else {
          auto fabricUIManager =
              contextContainer.at<jni::alias_ref<jobject>>("FabricUIManager");
          // Boxed Integer: null is an explicit miss; a non-null value may be 0
          // (transparent black).
          static auto getColorFromJava =
              fabricUIManager->getClass()
                  ->getMethod<jni::JInteger::javaobject(
                      jint, jni::JArrayClass<jni::JString>)>("getColor");
          auto javaResourcePaths =
              jni::JArrayClass<jni::JString>::newArray(resourcePaths.size());

          for (int i = 0; i < resourcePaths.size(); i++) {
            javaResourcePaths->setElement(
                i, *jni::make_jstring(resourcePaths[i]));
          }
          auto boxedColor =
              getColorFromJava(fabricUIManager, surfaceId, *javaResourcePaths);
          if (boxedColor) {
            resolvedColor = static_cast<Color>(boxedColor->value());
          }
          getColorCache().set(hash, resolvedColor);
        }
      }
      if (resolvedColor.has_value()) {
        color = *resolvedColor;
        resolved = true;
      }
    }

    // No path resolved: parse the raw fallback with the shared CSS parser (the
    // same parser iOS Fabric uses).
    if (!resolved) {
      auto fallbackIt = map.find("fallback");
      if (fallbackIt != map.end() &&
          fallbackIt->second.hasType<std::string>()) {
        auto cssColor =
            parseCSSProperty<CSSColor>((std::string)fallbackIt->second);
        if (std::holds_alternative<CSSColor>(cssColor)) {
          const auto& c = std::get<CSSColor>(cssColor);
          color = hostPlatformColorFromRGBA(c.r, c.g, c.b, c.a);
        }
      }
    }
  }

  return color;
}

} // namespace facebook::react
