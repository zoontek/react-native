/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/cxxstableapi/UmbrellaGuard.h>

#include <memory>
#include <optional>

#include <folly/dynamic.h>
#include <react/renderer/core/MediaFeatures.h>
#include <react/renderer/core/Props.h>
#include <react/renderer/core/RawProps.h>

namespace facebook::react {

/*
 * The prop that holds the conditional values of a props payload, by prop name.
 * Each conditional value has this format:
 *
 *   {
 *     "default": <value>,
 *     "conditions": [
 *       {"queries": ["@media (prefers-color-scheme: dark)", ...], "value": <value>},
 *       ...
 *     ]
 *   }
 *
 * A condition matches when all its queries match. The value of the last
 * matching condition is used, or the default value if no condition matches.
 * The values are already processed by JavaScript (for example with
 * `processColor`).
 */
inline constexpr const char *kConditionalPropsName = "__conditionalProps";

/*
 * Returns the value that a conditional value resolves to for `features`.
 */
folly::dynamic resolveConditionalValue(const folly::dynamic &conditionalValue, const MediaFeatures &features);

struct ConditionalPropsResolution {
  /*
   * The raw props to parse instead of the given ones: plain values only, with
   * the conditional values resolved for the current media features.
   */
  RawProps rawProps;

  /*
   * The conditional values of the new props. `nullptr` when there are none.
   */
  std::shared_ptr<const folly::dynamic> conditionalProps;

  /*
   * The generation of the media features that the values were resolved with.
   */
  MediaFeaturesGeneration generation;
};

/*
 * Merges the conditional values of `sourceProps` and `rawProps`, and resolves
 * the ones that are new or that were resolved with older media features.
 *
 * Returns `std::nullopt` when the new props can use `rawProps` as they are,
 * and keep the conditional values of `sourceProps` (the common case).
 */
std::optional<ConditionalPropsResolution> resolveConditionalProps(const Props *sourceProps, const RawProps &rawProps);

} // namespace facebook::react
