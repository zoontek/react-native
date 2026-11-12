/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <gtest/gtest.h>
#include <react/renderer/core/MediaFeatures.h>

using namespace facebook::react;

namespace {

const MediaFeatures kLight{
    .colorScheme = MediaColorScheme::Light,
    .contrast = MediaContrast::NoPreference};
const MediaFeatures kDarkMoreContrast{
    .colorScheme = MediaColorScheme::Dark,
    .contrast = MediaContrast::More};
const MediaFeatures kLessContrast{
    .colorScheme = MediaColorScheme::Light,
    .contrast = MediaContrast::Less};

} // namespace

TEST(MediaFeaturesTest, matchesPrefersColorScheme) {
  EXPECT_TRUE(matchMediaQuery("@media (prefers-color-scheme: light)", kLight));
  EXPECT_FALSE(matchMediaQuery("@media (prefers-color-scheme: dark)", kLight));
  EXPECT_TRUE(matchMediaQuery(
      "@media (prefers-color-scheme: dark)", kDarkMoreContrast));
  EXPECT_FALSE(matchMediaQuery(
      "@media (prefers-color-scheme: light)", kDarkMoreContrast));
}

TEST(MediaFeaturesTest, matchesPrefersContrast) {
  EXPECT_TRUE(
      matchMediaQuery("@media (prefers-contrast: no-preference)", kLight));
  EXPECT_FALSE(matchMediaQuery("@media (prefers-contrast: more)", kLight));
  EXPECT_TRUE(
      matchMediaQuery("@media (prefers-contrast: more)", kDarkMoreContrast));
  EXPECT_TRUE(
      matchMediaQuery("@media (prefers-contrast: less)", kLessContrast));
  EXPECT_FALSE(
      matchMediaQuery("@media (prefers-contrast: less)", kDarkMoreContrast));
}

TEST(MediaFeaturesTest, ignoresWhitespaceAndCase) {
  EXPECT_TRUE(matchMediaQuery(
      "  @MEDIA(  Prefers-Color-Scheme :DARK )  ", kDarkMoreContrast));
}

TEST(MediaFeaturesTest, matchesFeaturesCombinedWithAnd) {
  constexpr auto query =
      "@media (prefers-color-scheme: dark) and (prefers-contrast: more)";
  EXPECT_TRUE(matchMediaQuery(query, kDarkMoreContrast));
  EXPECT_FALSE(matchMediaQuery(query, kLight));
  EXPECT_FALSE(matchMediaQuery(
      query,
      {.colorScheme = MediaColorScheme::Dark,
       .contrast = MediaContrast::NoPreference}));
  EXPECT_FALSE(matchMediaQuery(
      query,
      {.colorScheme = MediaColorScheme::Light,
       .contrast = MediaContrast::More}));

  EXPECT_TRUE(matchMediaQuery(
      "@media (prefers-color-scheme: dark)AND  (prefers-contrast: more) and "
      "(prefers-color-scheme: dark)",
      kDarkMoreContrast));
}

TEST(MediaFeaturesTest, neverMatchesInvalidCombinations) {
  // An unsupported feature makes the whole query fail.
  EXPECT_FALSE(matchMediaQuery(
      "@media (prefers-color-scheme: dark) and (max-width: 800px)",
      kDarkMoreContrast));
  EXPECT_FALSE(matchMediaQuery(
      "@media (prefers-color-scheme: dark) or (prefers-contrast: more)",
      kDarkMoreContrast));
  EXPECT_FALSE(matchMediaQuery(
      "@media (prefers-color-scheme: dark) and", kDarkMoreContrast));
  EXPECT_FALSE(matchMediaQuery(
      "@media (prefers-color-scheme: dark) and(prefers-contrast: more)",
      kDarkMoreContrast));
  EXPECT_FALSE(matchMediaQuery(
      "@media (prefers-color-scheme: dark) (prefers-contrast: more)",
      kDarkMoreContrast));
  EXPECT_FALSE(matchMediaQuery(
      "@media (prefers-color-scheme: dark) and and (prefers-contrast: more)",
      kDarkMoreContrast));
}

TEST(MediaFeaturesTest, neverMatchesUnsupportedQueries) {
  EXPECT_FALSE(matchMediaQuery("@media (max-width: 800px)", kLight));
  EXPECT_FALSE(matchMediaQuery("@media (prefers-color-scheme)", kLight));
  EXPECT_FALSE(matchMediaQuery("@media (prefers-color-scheme: blue)", kLight));
  EXPECT_FALSE(matchMediaQuery("(prefers-color-scheme: light)", kLight));
  EXPECT_FALSE(matchMediaQuery("@media prefers-color-scheme: light", kLight));
  EXPECT_FALSE(matchMediaQuery("", kLight));
}

TEST(MediaFeaturesTest, reportsOnlyChanges) {
  setMediaFeatures(kLight);

  EXPECT_FALSE(setMediaFeatures(kLight));
  EXPECT_EQ(getMediaFeatures(), kLight);

  EXPECT_TRUE(setMediaFeatures(kDarkMoreContrast));
  EXPECT_EQ(getMediaFeatures(), kDarkMoreContrast);

  setMediaFeatures(kLight);
}
