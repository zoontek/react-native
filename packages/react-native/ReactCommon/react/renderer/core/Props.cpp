/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "Props.h"

#include <react/renderer/core/propsConversions.h>

#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/core/DynamicPropsUtilities.h>
#include <react/renderer/debug/debugStringConvertibleUtils.h>

namespace facebook::react {

Props::Props(
    const PropsParserContext& context,
    const Props& sourceProps,
    const RawProps& rawProps,
    [[maybe_unused]] const std::function<bool(const std::string&)>&
        filterObjectKeys)
    : nativeId(convertRawProp(
          context,
          rawProps,
          "nativeID",
          sourceProps.nativeId,
          {})) {}

void Props::setProp(
    const PropsParserContext& context,
    RawPropsPropNameHash hash,
    const char* /*propName*/,
    const RawValue& value) {
  switch (hash) {
    case CONSTEXPR_RAW_PROPS_KEY_HASH("nativeID"):
      fromRawValue(context, value, nativeId, {});
      return;
  }
}

#ifdef RN_SERIALIZABLE_STATE
namespace {

// Deep enough for a color in a gradient color stop of `backgroundImage`.
constexpr int kMaxAppearanceDependentValueDepth = 5;

// Matches the objects that `processColor` returns for DynamicColor and
// PlatformColor, anywhere in the value.
bool isAppearanceDependentValue(const folly::dynamic& value, int depth = 0) {
  if (depth > kMaxAppearanceDependentValueDepth) {
    return false;
  }
  if (value.isObject()) {
    if (value.count("dynamic") != 0 || value.count("resource_paths") != 0) {
      return true;
    }
    for (const auto& item : value.values()) {
      if (isAppearanceDependentValue(item, depth + 1)) {
        return true;
      }
    }
  } else if (value.isArray()) {
    for (const auto& item : value) {
      if (isAppearanceDependentValue(item, depth + 1)) {
        return true;
      }
    }
  }
  return false;
}

folly::dynamic updateAppearanceRawProps(
    const folly::dynamic& sourceAppearanceRawProps,
    const folly::dynamic& newRawProps) {
  auto appearanceRawProps = sourceAppearanceRawProps;
  if (!newRawProps.isObject()) {
    return appearanceRawProps;
  }
  for (const auto& [key, value] : newRawProps.items()) {
    if (isAppearanceDependentValue(value)) {
      if (!appearanceRawProps.isObject()) {
        appearanceRawProps = folly::dynamic::object();
      }
      appearanceRawProps[key] = value;
    } else if (appearanceRawProps.isObject()) {
      appearanceRawProps.erase(key);
    }
  }
  if (appearanceRawProps.isObject() && appearanceRawProps.empty()) {
    return nullptr;
  }
  return appearanceRawProps;
}

} // namespace

void Props::initializeDynamicProps(
    const Props& sourceProps,
    const RawProps& rawProps,
    const std::function<bool(const std::string&)>& filterObjectKeys) {
  auto newRawProps = rawProps.toDynamic(filterObjectKeys);
  appearanceRawProps =
      updateAppearanceRawProps(sourceProps.appearanceRawProps, newRawProps);
  if (ReactNativeFeatureFlags::enableAccumulatedUpdatesInRawPropsAndroid()) {
    this->rawProps = mergeDynamicProps(
        sourceProps.rawProps, newRawProps, NullValueStrategy::Override);
  } else {
    this->rawProps = std::move(newRawProps);
  }
}

ComponentName Props::getDiffPropsImplementationTarget() const {
  return "";
}
#endif

#pragma mark - DebugStringConvertible

#if RN_DEBUG_STRING_CONVERTIBLE
SharedDebugStringConvertibleList Props::getDebugProps() const {
  return {debugStringConvertibleItem("nativeID", nativeId)};
}
#endif

} // namespace facebook::react
