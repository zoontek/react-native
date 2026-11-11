/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <react/renderer/graphics/PlatformColorParser.h>

#include <string>
#include <unordered_map>

namespace facebook::react {

SharedColor parsePlatformColor(
    const ContextContainer& contextContainer,
    int32_t surfaceId,
    const RawValue& value) {
  // This platform has no appearance settings, so a DynamicColor always uses
  // its light variant.
  if (value.hasType<std::unordered_map<std::string, RawValue>>()) {
    auto items = (std::unordered_map<std::string, RawValue>)value;
    auto dynamicIt = items.find("dynamic");
    if (dynamicIt != items.end() &&
        dynamicIt->second
            .hasType<std::unordered_map<std::string, RawValue>>()) {
      auto dynamicItems =
          (std::unordered_map<std::string, RawValue>)dynamicIt->second;
      auto lightIt = dynamicItems.find("light");
      SharedColor color{};
      if (lightIt != dynamicItems.end() && lightIt->second.hasValue()) {
        fromRawValue(contextContainer, surfaceId, lightIt->second, color);
      }
      return color;
    }
  }

  float alpha = 0;
  float red = 0;
  float green = 0;
  float blue = 0;

  return {colorFromComponents(
      {.red = red, .green = green, .blue = blue, .alpha = alpha})};
}

} // namespace facebook::react
