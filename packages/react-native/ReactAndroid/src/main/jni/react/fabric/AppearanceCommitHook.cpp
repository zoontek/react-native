/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "AppearanceCommitHook.h"

#include <unordered_set>

#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/RawProps.h>
#include <react/renderer/mounting/ShadowTree.h>

namespace facebook::react {

namespace {

bool hasAppearanceRawProps(const ShadowNode& shadowNode) {
  const auto& appearanceRawProps = shadowNode.getProps()->appearanceRawProps;
  return appearanceRawProps.isObject() && !appearanceRawProps.empty();
}

void collectFamilies(
    const ShadowNode& shadowNode,
    std::unordered_map<std::shared_ptr<const ShadowNodeFamily>, Props::Shared>&
        familyProps) {
  if (hasAppearanceRawProps(shadowNode)) {
    familyProps.emplace(shadowNode.getFamilyShared(), nullptr);
  }
  for (const auto& child : shadowNode.getChildren()) {
    collectFamilies(*child, familyProps);
  }
}

} // namespace

AppearanceCommitHook::AppearanceCommitHook(UIManager& uiManager) {
  uiManager.registerCommitHook(*this);
}

void AppearanceCommitHook::commitHookWasRegistered(
    const UIManager& /*uiManager*/) noexcept {}

void AppearanceCommitHook::commitHookWasUnregistered(
    const UIManager& /*uiManager*/) noexcept {}

void AppearanceCommitHook::appearanceDidChange(const UIManager& uiManager) {
  uiManager.getShadowTreeRegistry().enumerate(
      [this](const ShadowTree& shadowTree, bool& /*stop*/) {
        FamilyProps familyProps;
        collectFamilies(
            *shadowTree.getCurrentRevision().rootShadowNode, familyProps);
        bool hasFamilies = !familyProps.empty();
        {
          std::scoped_lock lock(mutex_);
          surfaceFamilyProps_[shadowTree.getSurfaceId()] =
              std::move(familyProps);
        }
        if (!hasFamilies) {
          return;
        }
        // `shadowTreeWillCommit` parses the colors again.
        shadowTree.commit(
            [](const RootShadowNode& oldRootShadowNode) {
              return std::static_pointer_cast<RootShadowNode>(
                  oldRootShadowNode.ShadowNode::clone({}));
            },
            {});
      });
}

RootShadowNode::Unshared AppearanceCommitHook::shadowTreeWillCommit(
    const ShadowTree& shadowTree,
    const RootShadowNode::Shared& /*oldRootShadowNode*/,
    const RootShadowNode::Unshared& newRootShadowNode,
    const ShadowTreeCommitOptions& /*commitOptions*/) noexcept {
  std::scoped_lock lock(mutex_);
  auto surfaceIterator = surfaceFamilyProps_.find(shadowTree.getSurfaceId());
  if (surfaceIterator == surfaceFamilyProps_.end()) {
    return newRootShadowNode;
  }
  auto& familyProps = surfaceIterator->second;

  std::unordered_set<std::shared_ptr<const ShadowNodeFamily>> staleFamilies;
  for (auto iterator = familyProps.begin(); iterator != familyProps.end();) {
    auto ancestors = iterator->first->getAncestors(*newRootShadowNode);
    if (ancestors.empty()) {
      // The node is not in the tree anymore
      iterator = familyProps.erase(iterator);
      continue;
    }
    const auto& [parent, childIndex] = ancestors.back();
    const auto& shadowNode = *parent.get().getChildren()[childIndex];
    if (!hasAppearanceRawProps(shadowNode)) {
      iterator = familyProps.erase(iterator);
      continue;
    }
    // Other props mean another revision, which may hold colors parsed for the
    // old appearance.
    if (shadowNode.getProps() != iterator->second) {
      staleFamilies.insert(iterator->first);
    }
    ++iterator;
  }

  if (familyProps.empty()) {
    surfaceFamilyProps_.erase(surfaceIterator);
    return newRootShadowNode;
  }
  if (staleFamilies.empty()) {
    return newRootShadowNode;
  }

  auto clonedRootShadowNode = newRootShadowNode->cloneMultiple(
      staleFamilies,
      [&](const ShadowNode& shadowNode, const ShadowNodeFragment& fragment) {
        PropsParserContext propsParserContext{
            shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
        const auto& componentDescriptor = shadowNode.getComponentDescriptor();
        auto props = ShadowNodeFragment::propsPlaceholder();

        auto family = shadowNode.getFamilyShared();
        if (staleFamilies.contains(family)) {
          props = componentDescriptor.cloneProps(
              propsParserContext,
              shadowNode.getProps(),
              RawProps(shadowNode.getProps()->appearanceRawProps));
          familyProps[family] = props;
        } else if (
            fragment.children != nullptr &&
            shadowNode.getTraits().check(
                ShadowNodeTraits::Trait::MeasurableYogaNode)) {
          // A paragraph builds its text from its children only when it is
          // measured again, and only new props make it measure again.
          props = componentDescriptor.cloneProps(
              propsParserContext,
              shadowNode.getProps(),
              RawProps(folly::dynamic::object()));
        }

        return shadowNode.clone(
            {.props = props, .children = fragment.children});
      });

  if (clonedRootShadowNode == nullptr) {
    return newRootShadowNode;
  }
  return std::static_pointer_cast<RootShadowNode>(clonedRootShadowNode);
}

} // namespace facebook::react
