/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <memory>
#include <mutex>
#include <unordered_map>

#include <react/renderer/core/Props.h>
#include <react/renderer/core/ShadowNodeFamily.h>
#include <react/renderer/uimanager/UIManager.h>
#include <react/renderer/uimanager/UIManagerCommitHook.h>

namespace facebook::react {

/*
 * Parses DynamicColor and PlatformColor props again when the appearance of the
 * app changes, so mounted views and text get the colors of the new appearance.
 *
 * React keeps the shadow nodes it created, with colors parsed for the old
 * appearance, and commits them again in later revisions. So the hook checks
 * every commit and parses the colors again in nodes that came back from React.
 */
class AppearanceCommitHook : public UIManagerCommitHook {
 public:
  explicit AppearanceCommitHook(UIManager &uiManager);

  /*
   * Must be called after the color caches are cleared. Commits every surface
   * with the colors of the new appearance.
   */
  void appearanceDidChange(const UIManager &uiManager);

  void commitHookWasRegistered(const UIManager &uiManager) noexcept override;
  void commitHookWasUnregistered(const UIManager &uiManager) noexcept override;

  RootShadowNode::Unshared shadowTreeWillCommit(
      const ShadowTree &shadowTree,
      const RootShadowNode::Shared &oldRootShadowNode,
      const RootShadowNode::Unshared &newRootShadowNode,
      const ShadowTreeCommitOptions &commitOptions) noexcept override;

 private:
  // For each family with appearance-dependent props, the props parsed for the
  // current appearance. `nullptr` until they are parsed.
  using FamilyProps = std::unordered_map<std::shared_ptr<const ShadowNodeFamily>, Props::Shared>;

  std::mutex mutex_;
  std::unordered_map<SurfaceId, FamilyProps> surfaceFamilyProps_;
};

} // namespace facebook::react
