/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <react/cxxstableapi/UmbrellaGuard.h>

#include <cstdint>
#include <string_view>

namespace facebook::react {

enum class MediaColorScheme : uint8_t { Light, Dark };

enum class MediaContrast : uint8_t { NoPreference, Less, More };

enum class MediaOrientation : uint8_t { Portrait, Landscape };

/*
 * The values that media queries in props are matched against, for example
 * `@media (prefers-color-scheme: dark)`.
 *
 * Aligned on 4 bytes, so that `std::atomic<MediaFeatures>` is lock-free.
 */
struct alignas(4) MediaFeatures {
  MediaColorScheme colorScheme{MediaColorScheme::Light};
  MediaContrast contrast{MediaContrast::NoPreference};
  MediaOrientation orientation{MediaOrientation::Portrait};

  bool operator==(const MediaFeatures &other) const = default;
};

/*
 * Returns the current media features of the process. Thread-safe.
 */
MediaFeatures getMediaFeatures() noexcept;

/*
 * Sets the current media features of the process. Returns `true` if they
 * changed. Thread-safe.
 *
 * This does not update existing shadow nodes. To do it, use
 * `Scheduler::updateMediaFeatures` or `UIManager::updateConditionalProps`.
 */
bool setMediaFeatures(const MediaFeatures &features) noexcept;

/*
 * Returns whether `query` (for example `@media (prefers-color-scheme: dark)`)
 * matches `features`. A query that is not supported never matches.
 *
 * Supported media features:
 * - `(prefers-color-scheme: light | dark)`
 * - `(prefers-contrast: no-preference | less | more)`
 * - `(orientation: portrait | landscape)`
 *
 * Features can be combined with `and`, for example
 * `@media (prefers-color-scheme: dark) and (prefers-contrast: more)`.
 */
bool matchMediaQuery(std::string_view query, const MediaFeatures &features) noexcept;

} // namespace facebook::react
