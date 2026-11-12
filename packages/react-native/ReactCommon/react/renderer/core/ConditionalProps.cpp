/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "ConditionalProps.h"

namespace facebook::react {

namespace {

bool matchesAllQueries(
    const folly::dynamic& queries,
    const MediaFeatures& features) {
  if (!queries.isArray()) {
    return false;
  }
  for (const auto& query : queries) {
    if (!query.isString() || !matchMediaQuery(query.getString(), features)) {
      return false;
    }
  }
  return true;
}

} // namespace

folly::dynamic resolveConditionalValue(
    const folly::dynamic& conditionalValue,
    const MediaFeatures& features) {
  if (!conditionalValue.isObject()) {
    return nullptr;
  }

  const auto* resolvedValue = conditionalValue.get_ptr("default");

  const auto* conditions = conditionalValue.get_ptr("conditions");
  if (conditions != nullptr && conditions->isArray()) {
    for (const auto& condition : *conditions) {
      if (!condition.isObject()) {
        continue;
      }
      const auto* queries = condition.get_ptr("queries");
      const auto* value = condition.get_ptr("value");
      if (queries != nullptr && value != nullptr &&
          matchesAllQueries(*queries, features)) {
        resolvedValue = value;
      }
    }
  }

  return resolvedValue != nullptr ? *resolvedValue : nullptr;
}

std::optional<ConditionalPropsResolution> resolveConditionalProps(
    const Props* sourceProps,
    const RawProps& rawProps) {
  const auto* sourceConditionalProps =
      sourceProps != nullptr ? sourceProps->conditionalProps.get() : nullptr;
  auto hasNewConditionalProps = rawProps.hasProperty(kConditionalPropsName);

  if (sourceConditionalProps == nullptr && !hasNewConditionalProps) {
    return std::nullopt;
  }

  auto snapshot = getMediaFeaturesSnapshot();
  auto isStale = sourceConditionalProps != nullptr &&
      sourceProps->conditionalPropsGeneration != snapshot.generation;

  if (!hasNewConditionalProps && !isStale) {
    // The source conditional values are up to date. They only change if
    // `rawProps` gives a plain value to one of their props.
    auto isAnyReplaced = false;
    for (const auto& item : sourceConditionalProps->items()) {
      if (rawProps.hasProperty(item.first.c_str())) {
        isAnyReplaced = true;
        break;
      }
    }
    if (!isAnyReplaced) {
      return std::nullopt;
    }
  }

  auto values = rawProps.toDynamic();

  folly::dynamic newConditionalProps = folly::dynamic::object();
  if (auto it = values.find(kConditionalPropsName);
      it != values.items().end()) {
    if (it->second.isObject()) {
      newConditionalProps = std::move(it->second);
    }
    values.erase(kConditionalPropsName);
  }

  folly::dynamic conditionalProps = sourceConditionalProps != nullptr
      ? *sourceConditionalProps
      : folly::dynamic(folly::dynamic::object());

  // A plain value replaces the conditional value of the same prop.
  for (const auto& item : values.items()) {
    conditionalProps.erase(item.first);
  }

  for (const auto& item : newConditionalProps.items()) {
    values[item.first] =
        resolveConditionalValue(item.second, snapshot.features);
    conditionalProps[item.first] = item.second;
  }

  if (isStale) {
    for (const auto& item : conditionalProps.items()) {
      if (newConditionalProps.count(item.first) == 0) {
        values[item.first] =
            resolveConditionalValue(item.second, snapshot.features);
      }
    }
  }

  return ConditionalPropsResolution{
      .rawProps = RawProps(std::move(values)),
      .conditionalProps = conditionalProps.empty()
          ? nullptr
          : std::make_shared<const folly::dynamic>(std::move(conditionalProps)),
      .generation = snapshot.generation,
  };
}

} // namespace facebook::react
