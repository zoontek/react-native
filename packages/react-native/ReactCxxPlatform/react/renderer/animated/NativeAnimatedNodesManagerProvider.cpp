/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "NativeAnimatedNodesManagerProvider.h"

#include <glog/logging.h>
#include <react/featureflags/ReactNativeFeatureFlags.h>
#include <react/renderer/animated/AnimatedMountingOverrideDelegate.h>
#include <react/renderer/uimanager/UIManagerBinding.h>

namespace facebook::react {

UIManagerNativeAnimatedDelegateImpl::UIManagerNativeAnimatedDelegateImpl(
    std::weak_ptr<NativeAnimatedNodesManager> nativeAnimatedNodesManager)
    : nativeAnimatedNodesManager_(std::move(nativeAnimatedNodesManager)) {}

void UIManagerNativeAnimatedDelegateImpl::runAnimationFrame() {
  if (auto nativeAnimatedNodesManagerStrong =
          nativeAnimatedNodesManager_.lock()) {
    nativeAnimatedNodesManagerStrong->onRender();
  }
}

NativeAnimatedNodesManagerProvider::NativeAnimatedNodesManagerProvider(
    NativeAnimatedNodesManager::StartOnRenderCallback startOnRenderCallback,
    NativeAnimatedNodesManager::StopOnRenderCallback stopOnRenderCallback)
    : eventEmitterListenerContainer_(
          std::make_shared<EventEmitterListenerContainer>()),
      startOnRenderCallback_(std::move(startOnRenderCallback)),
      stopOnRenderCallback_(std::move(stopOnRenderCallback)) {}

std::shared_ptr<NativeAnimatedNodesManager>
NativeAnimatedNodesManagerProvider::getOrCreate(jsi::Runtime& runtime) {
  if (nativeAnimatedNodesManager_ == nullptr) {
    auto* uiManager = &UIManagerBinding::getBinding(runtime)->getUIManager();

    NativeAnimatedNodesManager::FabricCommitCallback fabricCommitCallback =
        nullptr;
    if (!ReactNativeFeatureFlags::disableFabricCommitInCXXAnimated()) {
      fabricCommitCallback =
          [uiManager](std::unordered_map<Tag, folly::dynamic>& tagToProps) {
            uiManager->updateShadowTree(tagToProps);
          };
    }

    auto directManipulationCallback =
        [uiManager](Tag viewTag, const folly::dynamic& props) {
          uiManager->synchronouslyUpdateViewOnUIThread(viewTag, props);
        };

    nativeAnimatedNodesManager_ = std::make_shared<NativeAnimatedNodesManager>(
        std::move(directManipulationCallback),
        std::move(fabricCommitCallback),
        std::move(startOnRenderCallback_),
        std::move(stopOnRenderCallback_));

    addEventEmitterListener(
        nativeAnimatedNodesManager_->getEventEmitterListener());

    uiManager->addEventListener(std::make_shared<EventListener>(
        [eventEmitterListenerContainerWeak =
             std::weak_ptr<EventEmitterListenerContainer>(
                 eventEmitterListenerContainer_)](const RawEvent& rawEvent) {
          const auto& eventTarget = rawEvent.eventTarget;
          const auto& eventPayload = rawEvent.eventPayload;
          if (eventTarget && eventPayload) {
            if (auto eventEmitterListenerContainer =
                    eventEmitterListenerContainerWeak.lock();
                eventEmitterListenerContainer != nullptr) {
              return eventEmitterListenerContainer->willDispatchEvent(
                  eventTarget->getTag(), rawEvent.type, *eventPayload);
            }
          }
          return false;
        }));

    nativeAnimatedDelegate_ =
        std::make_shared<UIManagerNativeAnimatedDelegateImpl>(
            nativeAnimatedNodesManager_);

    uiManager->setNativeAnimatedDelegate(nativeAnimatedDelegate_);

    // TODO: remove force casting.
    auto* scheduler = (Scheduler*)uiManager->getDelegate();
    animatedMountingOverrideDelegate_ =
        std::make_shared<AnimatedMountingOverrideDelegate>(
            *nativeAnimatedNodesManager_, *scheduler);

    // Register on existing surfaces
    uiManager->getShadowTreeRegistry().enumerate(
        [animatedMountingOverrideDelegate =
             std::weak_ptr<const AnimatedMountingOverrideDelegate>(
                 animatedMountingOverrideDelegate_)](
            const ShadowTree& shadowTree, bool& /*stop*/) {
          shadowTree.getMountingCoordinator()->setMountingOverrideDelegate(
              animatedMountingOverrideDelegate);
        });
    // Register on surfaces started in the future
    uiManager->setOnSurfaceStartCallback(
        [animatedMountingOverrideDelegate =
             std::weak_ptr<const AnimatedMountingOverrideDelegate>(
                 animatedMountingOverrideDelegate_)](
            const ShadowTree& shadowTree) {
          shadowTree.getMountingCoordinator()->setMountingOverrideDelegate(
              animatedMountingOverrideDelegate);
        });
  }
  return nativeAnimatedNodesManager_;
}

void NativeAnimatedNodesManagerProvider::addEventEmitterListener(
    const std::shared_ptr<EventEmitterListener>& listener) {
  eventEmitterListenerContainer_->addListener(listener);
}

std::shared_ptr<EventEmitterListener>
NativeAnimatedNodesManagerProvider::getEventEmitterListener() {
  if (!eventEmitterListener_) {
    eventEmitterListener_ = std::make_shared<EventEmitterListener>(
        [eventEmitterListenerContainerWeak =
             std::weak_ptr<EventEmitterListenerContainer>(
                 eventEmitterListenerContainer_)](
            Tag tag,
            const std::string& eventName,
            const EventPayload& payload) -> bool {
          if (auto eventEmitterListenerContainer =
                  eventEmitterListenerContainerWeak.lock();
              eventEmitterListenerContainer != nullptr) {
            return eventEmitterListenerContainer->willDispatchEvent(
                tag, eventName, payload);
          }
          return false;
        });
  }
  return eventEmitterListener_;
}

} // namespace facebook::react
