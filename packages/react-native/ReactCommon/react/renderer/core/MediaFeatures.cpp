/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "MediaFeatures.h"

#include <atomic>

namespace facebook::react {

namespace {

std::atomic<MediaFeatures> currentMediaFeatures{MediaFeatures{}};

char toLowerAscii(char c) noexcept {
  return (c >= 'A' && c <= 'Z') ? static_cast<char>(c - 'A' + 'a') : c;
}

bool equalsIgnoringAsciiCase(std::string_view a, std::string_view b) noexcept {
  if (a.size() != b.size()) {
    return false;
  }
  for (size_t i = 0; i < a.size(); i++) {
    if (toLowerAscii(a[i]) != b[i]) {
      return false;
    }
  }
  return true;
}

bool isWhitespace(char c) noexcept {
  return c == ' ' || c == '\t' || c == '\n' || c == '\r' || c == '\f';
}

std::string_view trim(std::string_view value) noexcept {
  while (!value.empty() && isWhitespace(value.front())) {
    value.remove_prefix(1);
  }
  while (!value.empty() && isWhitespace(value.back())) {
    value.remove_suffix(1);
  }
  return value;
}

// Matches the inside of `(feature: value)`. A feature or value that is not
// supported never matches.
bool matchMediaFeature(
    std::string_view feature,
    const MediaFeatures& features) noexcept {
  auto colon = feature.find(':');
  if (colon == std::string_view::npos) {
    return false;
  }
  auto name = trim(feature.substr(0, colon));
  auto value = trim(feature.substr(colon + 1));

  if (equalsIgnoringAsciiCase(name, "prefers-color-scheme")) {
    if (equalsIgnoringAsciiCase(value, "light")) {
      return features.colorScheme == MediaColorScheme::Light;
    }
    if (equalsIgnoringAsciiCase(value, "dark")) {
      return features.colorScheme == MediaColorScheme::Dark;
    }
    return false;
  }

  if (equalsIgnoringAsciiCase(name, "prefers-contrast")) {
    if (equalsIgnoringAsciiCase(value, "no-preference")) {
      return features.contrast == MediaContrast::NoPreference;
    }
    if (equalsIgnoringAsciiCase(value, "less")) {
      return features.contrast == MediaContrast::Less;
    }
    if (equalsIgnoringAsciiCase(value, "more")) {
      return features.contrast == MediaContrast::More;
    }
    return false;
  }

  return false;
}

} // namespace

MediaFeatures getMediaFeatures() noexcept {
  return currentMediaFeatures.load(std::memory_order_acquire);
}

bool setMediaFeatures(const MediaFeatures& features) noexcept {
  return currentMediaFeatures.exchange(features, std::memory_order_acq_rel) !=
      features;
}

bool matchMediaQuery(
    std::string_view query,
    const MediaFeatures& features) noexcept {
  constexpr std::string_view kMedia = "@media";
  constexpr std::string_view kAnd = "and";

  auto rest = trim(query);
  if (rest.size() < kMedia.size() ||
      !equalsIgnoringAsciiCase(rest.substr(0, kMedia.size()), kMedia)) {
    return false;
  }
  rest = trim(rest.substr(kMedia.size()));

  // `(feature: value)`, optionally followed by `and (feature: value)` parts.
  // All the parts must match.
  while (true) {
    if (rest.empty() || rest.front() != '(') {
      return false;
    }
    auto close = rest.find(')');
    if (close == std::string_view::npos ||
        !matchMediaFeature(rest.substr(1, close - 1), features)) {
      return false;
    }
    rest = trim(rest.substr(close + 1));

    if (rest.empty()) {
      return true;
    }

    if (rest.size() <= kAnd.size() ||
        !equalsIgnoringAsciiCase(rest.substr(0, kAnd.size()), kAnd) ||
        !isWhitespace(rest[kAnd.size()])) {
      return false;
    }
    rest = trim(rest.substr(kAnd.size()));
  }
}

} // namespace facebook::react
