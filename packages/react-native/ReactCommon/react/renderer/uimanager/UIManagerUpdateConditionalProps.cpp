/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "UIManager.h"

#include <cxxreact/TraceSection.h>
#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/core/MediaFeatures.h>
#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/core/ShadowNodeFragment.h>

namespace facebook::react {

namespace {

/*
 * Returns a clone of `shadowNode` where the props with conditional values that
 * were resolved with other media features are resolved again. Returns
 * `nullptr` if nothing changed in the subtree.
 */
std::shared_ptr<ShadowNode> cloneWithUpdatedConditionalProps(
    const ShadowNode& shadowNode,
    const PropsParserContext& context,
    const MediaFeatures& mediaFeatures) {
  const auto& children = shadowNode.getChildren();
  std::shared_ptr<std::vector<std::shared_ptr<const ShadowNode>>> newChildren;
  for (size_t index = 0; index < children.size(); index++) {
    auto newChild = cloneWithUpdatedConditionalProps(
        *children[index], context, mediaFeatures);
    if (newChild) {
      if (!newChildren) {
        newChildren =
            std::make_shared<std::vector<std::shared_ptr<const ShadowNode>>>(
                children);
      }
      (*newChildren)[index] = std::move(newChild);
    }
  }

  Props::Shared newProps;
  const auto& props = shadowNode.getProps();
  if (props->conditionalProps != nullptr &&
      props->conditionalPropsMediaFeatures != mediaFeatures) {
    // Empty raw props: `cloneProps` resolves the outdated conditional values
    // of `props` again.
    newProps = shadowNode.getComponentDescriptor().cloneProps(
        context, props, RawProps(folly::dynamic::object()));
  }

  if (!newChildren && !newProps) {
    return nullptr;
  }

  std::shared_ptr<const std::vector<std::shared_ptr<const ShadowNode>>>
      fragmentChildren =
          newChildren ? newChildren : ShadowNodeFragment::childrenPlaceholder();

  return shadowNode.clone({
      .props = newProps ? newProps : ShadowNodeFragment::propsPlaceholder(),
      .children = fragmentChildren,
  });
}

} // namespace

void UIManager::updateConditionalProps() const {
  TraceSection s("UIManager::updateConditionalProps");

  auto mediaFeatures = getMediaFeatures();

  shadowTreeRegistry_.enumerate([&](const ShadowTree& shadowTree,
                                    bool& /*stop*/) {
    PropsParserContext context{shadowTree.getSurfaceId(), *contextContainer_};
    shadowTree.commit(
        [&](const RootShadowNode& oldRootShadowNode)
            -> RootShadowNode::Unshared {
          return std::static_pointer_cast<RootShadowNode>(
              cloneWithUpdatedConditionalProps(
                  oldRootShadowNode, context, mediaFeatures));
        },
        {.enableStateReconciliation = true});
  });
}

} // namespace facebook::react
