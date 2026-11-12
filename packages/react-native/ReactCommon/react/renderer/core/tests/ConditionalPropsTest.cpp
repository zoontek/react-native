/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <memory>

#include <gtest/gtest.h>
#include <react/renderer/core/ConditionalProps.h>
#include <react/renderer/core/MediaFeatures.h>
#include <react/renderer/core/Props.h>
#include <react/renderer/core/RawProps.h>

using namespace facebook::react;

namespace {

constexpr const char* kDarkQuery = "@media (prefers-color-scheme: dark)";
constexpr const char* kMoreContrastQuery = "@media (prefers-contrast: more)";

const MediaFeatures kLight{
    .colorScheme = MediaColorScheme::Light,
    .contrast = MediaContrast::NoPreference};
const MediaFeatures kDark{
    .colorScheme = MediaColorScheme::Dark,
    .contrast = MediaContrast::NoPreference};
const MediaFeatures kDarkMoreContrast{
    .colorScheme = MediaColorScheme::Dark,
    .contrast = MediaContrast::More};

folly::dynamic condition(folly::dynamic queries, folly::dynamic value) {
  return folly::dynamic::object("queries", std::move(queries))(
      "value", std::move(value));
}

// `{default: 1, [DARK]: 2, [MORE_CONTRAST]: 3}`
folly::dynamic opacityValue() {
  return folly::dynamic::object("default", 1)(
      "conditions",
      folly::dynamic::array(
          condition(folly::dynamic::array(kDarkQuery), 2),
          condition(folly::dynamic::array(kMoreContrastQuery), 3)));
}

class ConditionalPropsTest : public ::testing::Test {
 protected:
  void SetUp() override {
    setMediaFeatures(kLight);
  }

  void TearDown() override {
    setMediaFeatures(kLight);
  }
};

} // namespace

TEST_F(ConditionalPropsTest, resolvesTheLastMatchingCondition) {
  EXPECT_EQ(resolveConditionalValue(opacityValue(), kLight), 1);
  EXPECT_EQ(resolveConditionalValue(opacityValue(), kDark), 2);
  EXPECT_EQ(resolveConditionalValue(opacityValue(), kDarkMoreContrast), 3);
}

TEST_F(ConditionalPropsTest, matchesAConditionOnlyIfAllItsQueriesMatch) {
  folly::dynamic value = folly::dynamic::object("default", 1)(
      "conditions",
      folly::dynamic::array(
          condition(folly::dynamic::array(kDarkQuery, kMoreContrastQuery), 2),
          condition(folly::dynamic::array(), 3)));
  // A condition without queries always matches.
  EXPECT_EQ(resolveConditionalValue(value, kDarkMoreContrast), 3);

  value["conditions"].erase(value["conditions"].begin() + 1);
  EXPECT_EQ(resolveConditionalValue(value, kDark), 1);
  EXPECT_EQ(resolveConditionalValue(value, kDarkMoreContrast), 2);
}

TEST_F(ConditionalPropsTest, resolvesToNullWithoutDefaultValue) {
  EXPECT_EQ(
      resolveConditionalValue(folly::dynamic(folly::dynamic::object()), kLight),
      nullptr);
  EXPECT_EQ(resolveConditionalValue(42, kLight), nullptr);
}

TEST_F(ConditionalPropsTest, doesNothingWithoutConditionalValues) {
  Props sourceProps;
  auto rawProps = RawProps(folly::dynamic::object("opacity", 0.5));
  EXPECT_FALSE(resolveConditionalProps(&sourceProps, rawProps).has_value());
  EXPECT_FALSE(resolveConditionalProps(nullptr, rawProps).has_value());
}

TEST_F(ConditionalPropsTest, resolvesNewConditionalValues) {
  setMediaFeatures(kDark);
  auto rawProps = RawProps(
      folly::dynamic::object("nativeID", "box")(
          kConditionalPropsName,
          folly::dynamic::object("opacity", opacityValue())));

  auto resolution = resolveConditionalProps(nullptr, rawProps);
  ASSERT_TRUE(resolution.has_value());
  EXPECT_EQ(
      resolution->rawProps.toDynamic(),
      folly::dynamic(folly::dynamic::object("nativeID", "box")("opacity", 2)));
  ASSERT_NE(resolution->conditionalProps, nullptr);
  EXPECT_EQ(
      *resolution->conditionalProps,
      folly::dynamic(folly::dynamic::object("opacity", opacityValue())));
  EXPECT_EQ(resolution->mediaFeatures, kDark);
}

TEST_F(ConditionalPropsTest, keepsUpToDateConditionalValuesOfTheSource) {
  Props sourceProps;
  sourceProps.conditionalProps = std::make_shared<const folly::dynamic>(
      folly::dynamic::object("opacity", opacityValue()));
  sourceProps.conditionalPropsMediaFeatures = kLight;

  auto rawProps = RawProps(folly::dynamic::object("nativeID", "box"));
  EXPECT_FALSE(resolveConditionalProps(&sourceProps, rawProps).has_value());
}

TEST_F(ConditionalPropsTest, dropsConditionalValuesReplacedByPlainValues) {
  Props sourceProps;
  sourceProps.conditionalProps = std::make_shared<const folly::dynamic>(
      folly::dynamic::object("opacity", opacityValue()));
  sourceProps.conditionalPropsMediaFeatures = kLight;

  auto rawProps = RawProps(folly::dynamic::object("opacity", 0.5));
  auto resolution = resolveConditionalProps(&sourceProps, rawProps);
  ASSERT_TRUE(resolution.has_value());
  EXPECT_EQ(
      resolution->rawProps.toDynamic(),
      folly::dynamic(folly::dynamic::object("opacity", 0.5)));
  EXPECT_EQ(resolution->conditionalProps, nullptr);
}

TEST_F(ConditionalPropsTest, resolvesOutdatedConditionalValuesOfTheSource) {
  Props sourceProps;
  sourceProps.conditionalProps = std::make_shared<const folly::dynamic>(
      folly::dynamic::object("opacity", opacityValue()));
  sourceProps.conditionalPropsMediaFeatures = kLight;

  setMediaFeatures(kDarkMoreContrast);

  auto rawProps = RawProps(folly::dynamic::object());
  auto resolution = resolveConditionalProps(&sourceProps, rawProps);
  ASSERT_TRUE(resolution.has_value());
  EXPECT_EQ(
      resolution->rawProps.toDynamic(),
      folly::dynamic(folly::dynamic::object("opacity", 3)));
  ASSERT_NE(resolution->conditionalProps, nullptr);
  EXPECT_EQ(*resolution->conditionalProps, *sourceProps.conditionalProps);
  EXPECT_EQ(resolution->mediaFeatures, kDarkMoreContrast);
}
