/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.os.Bundle;
import android.view.KeyEvent;
import androidx.annotation.Nullable;
import com.facebook.infer.annotation.Assertions;
import com.facebook.infer.annotation.Nullsafe;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.UiThreadUtil;
import com.facebook.react.common.annotations.DeprecatedInNewArchitecture;
import com.facebook.react.devsupport.DoubleTapReloadRecognizer;
import com.facebook.react.devsupport.ReleaseDevSupportManager;
import com.facebook.react.devsupport.interfaces.DevSupportManager;
import com.facebook.react.interfaces.fabric.ReactSurface;
import com.facebook.react.internal.featureflags.ReactNativeNewArchitectureFeatureFlags;
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler;
import java.util.Objects;

/**
 * A delegate for handling React Application support. This delegate is unaware whether it is used in
 * an {@link Activity} or a {@link android.app.Fragment}.
 */
@Nullsafe(Nullsafe.Mode.LOCAL)
public class ReactDelegate {

  private final Activity mActivity;

  @Nullable private ReactRootView mReactRootView;

  @Nullable private final String mMainComponentName;

  @Nullable private Bundle mLaunchOptions;

  @Nullable private DoubleTapReloadRecognizer mDoubleTapReloadRecognizer;

  @Nullable private ReactNativeHost mReactNativeHost;

  @Nullable private ReactHost mReactHost;

  @Nullable private ReactSurface mReactSurface;

  private boolean mFabricEnabled = ReactNativeNewArchitectureFeatureFlags.enableFabricRenderer();

  /**
   * Do not use this constructor as it's not accounting for New Architecture at all. You should use
   * {@link ReactDelegate#ReactDelegate(Activity, ReactNativeHost, String, Bundle, boolean)} as it's
   * the constructor used for New Architecture.
   *
   * @deprecated Use one of the other constructors instead to account for New Architecture.
   */
  @Deprecated(since = "0.75.0")
  public ReactDelegate(
      Activity activity,
      @Nullable ReactNativeHost reactNativeHost,
      @Nullable String appKey,
      @Nullable Bundle launchOptions) {
    mActivity = activity;
    mMainComponentName = appKey;
    mLaunchOptions = launchOptions;
    mDoubleTapReloadRecognizer = new DoubleTapReloadRecognizer();
    mReactNativeHost = reactNativeHost;
  }

  public ReactDelegate(
      Activity activity,
      @Nullable ReactHost reactHost,
      @Nullable String appKey,
      @Nullable Bundle launchOptions) {
    mActivity = activity;
    mMainComponentName = appKey;
    mLaunchOptions = launchOptions;
    mDoubleTapReloadRecognizer = new DoubleTapReloadRecognizer();
    mReactHost = reactHost;
  }

  @Deprecated(since = "0.81.0")
  public ReactDelegate(
      Activity activity,
      @Nullable ReactNativeHost reactNativeHost,
      @Nullable String appKey,
      @Nullable Bundle launchOptions,
      boolean fabricEnabled) {
    mFabricEnabled = fabricEnabled;
    mActivity = activity;
    mMainComponentName = appKey;
    mLaunchOptions = launchOptions;
    mDoubleTapReloadRecognizer = new DoubleTapReloadRecognizer();
    mReactNativeHost = reactNativeHost;
  }

  @Nullable
  private DevSupportManager getDevSupportManager() {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null
        && mReactHost.getDevSupportManager() != null) {
      return mReactHost.getDevSupportManager();
    } else if (getReactNativeHost() != null
        && getReactNativeHost().hasInstance()
        && getReactNativeHost().getReactInstanceManager() != null) {
      return getReactNativeHost().getReactInstanceManager().getDevSupportManager();
    } else {
      return null;
    }
  }

  public void onHostResume() {
    if (!(mActivity instanceof DefaultHardwareBackBtnHandler)) {
      throw new ClassCastException(
          "Host Activity `${activity.javaClass.simpleName}` does not implement"
              + " DefaultHardwareBackBtnHandler");
    }
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null) {
      mReactHost.onHostResume(mActivity, (DefaultHardwareBackBtnHandler) mActivity);
    } else {
      ReactNativeHost reactNativeHost = getReactNativeHost();
      if (reactNativeHost != null && reactNativeHost.hasInstance()) {
        reactNativeHost
            .getReactInstanceManager()
            .onHostResume(mActivity, (DefaultHardwareBackBtnHandler) mActivity);
      }
    }
  }

  public void onUserLeaveHint() {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null) {
      mReactHost.onHostLeaveHint(mActivity);
    } else {
      ReactNativeHost reactNativeHost = getReactNativeHost();
      if (reactNativeHost != null && reactNativeHost.hasInstance()) {
        reactNativeHost.getReactInstanceManager().onUserLeaveHint(mActivity);
      }
    }
  }

  public void onHostPause() {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null) {
      mReactHost.onHostPause(mActivity);
    } else {
      ReactNativeHost reactNativeHost = getReactNativeHost();
      if (reactNativeHost != null && reactNativeHost.hasInstance()) {
        reactNativeHost.getReactInstanceManager().onHostPause(mActivity);
      }
    }
  }

  public void onHostDestroy() {
    unloadApp();
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null) {
      mReactHost.onHostDestroy(mActivity);
    } else {
      ReactNativeHost reactNativeHost = getReactNativeHost();
      if (reactNativeHost != null && reactNativeHost.hasInstance()) {
        reactNativeHost.getReactInstanceManager().onHostDestroy(mActivity);
      }
    }
  }

  public boolean onBackPressed() {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null) {
      mReactHost.onBackPressed();
      return true;
    } else {
      ReactNativeHost reactNativeHost = getReactNativeHost();
      if (reactNativeHost != null && reactNativeHost.hasInstance()) {
        reactNativeHost.getReactInstanceManager().onBackPressed();
        return true;
      }
    }
    return false;
  }

  public boolean onNewIntent(Intent intent) {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null) {
      mReactHost.onNewIntent(intent);
      return true;
    } else {
      ReactNativeHost reactNativeHost = getReactNativeHost();
      if (reactNativeHost != null && reactNativeHost.hasInstance()) {
        reactNativeHost.getReactInstanceManager().onNewIntent(intent);
        return true;
      }
    }
    return false;
  }

  public void onActivityResult(
      int requestCode,
      int resultCode,
      @Nullable Intent data,
      boolean shouldForwardToReactInstance) {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null) {
      mReactHost.onActivityResult(mActivity, requestCode, resultCode, data);
    } else {
      ReactNativeHost reactNativeHost = getReactNativeHost();
      if (reactNativeHost != null
          && reactNativeHost.hasInstance()
          && shouldForwardToReactInstance) {
        reactNativeHost
            .getReactInstanceManager()
            .onActivityResult(mActivity, requestCode, resultCode, data);
      }
    }
  }

  public void onWindowFocusChanged(boolean hasFocus) {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null) {
      mReactHost.onWindowFocusChange(hasFocus);
    } else {
      if (getReactNativeHost() != null && getReactNativeHost().hasInstance()) {
        getReactNativeHost().getReactInstanceManager().onWindowFocusChange(hasFocus);
      }
    }
  }

  public void onConfigurationChanged(Configuration newConfig) {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
        && mReactHost != null) {
      mReactHost.onConfigurationChanged(Assertions.assertNotNull(mActivity));
    } else {
      if (getReactNativeHost() != null && getReactNativeHost().hasInstance()) {
        getReactInstanceManager()
            .onConfigurationChanged(Assertions.assertNotNull(mActivity), newConfig);
      }
    }
  }

  public boolean onKeyDown(int keyCode, KeyEvent event) {
    if (keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD
        && ((ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
                && mReactHost != null
                && mReactHost.getDevSupportManager() != null)
            || (getReactNativeHost() != null
                && getReactNativeHost().hasInstance()
                && getReactNativeHost().getUseDeveloperSupport()))) {
      event.startTracking();
      return true;
    }
    return false;
  }

  public boolean onKeyLongPress(int keyCode) {
    if (keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD) {
      if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()
          && mReactHost != null) {
        DevSupportManager devSupportManager = mReactHost.getDevSupportManager();
        // onKeyLongPress is a Dev API and not supported in RELEASE mode.
        if (devSupportManager != null && !(devSupportManager instanceof ReleaseDevSupportManager)) {
          devSupportManager.showDevOptionsDialog();
          return true;
        }
      } else {
        ReactNativeHost reactNativeHost = getReactNativeHost();
        if (reactNativeHost != null
            && reactNativeHost.hasInstance()
            && reactNativeHost.getUseDeveloperSupport()) {
          reactNativeHost.getReactInstanceManager().showDevOptionsDialog();
          return true;
        }
      }
    }
    return false;
  }

  public void reload() {
    DevSupportManager devSupportManager = getDevSupportManager();
    if (devSupportManager == null) {
      return;
    }

    // Reload in RELEASE mode
    if (devSupportManager instanceof ReleaseDevSupportManager) {
      // Do not reload the bundle from JS as there is no bundler running in release mode.
      if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()) {
        if (mReactHost != null) {
          mReactHost.reload("ReactDelegate.reload()");
        }
      } else {
        UiThreadUtil.runOnUiThread(
            () -> {
              if (mReactNativeHost != null
                  && mReactNativeHost.hasInstance()
                  && mReactNativeHost.getReactInstanceManager() != null) {
                mReactNativeHost.getReactInstanceManager().recreateReactContextInBackground();
              }
            });
      }
      return;
    }

    // Reload in DEBUG mode
    devSupportManager.handleReloadJS();
  }

  /** Start the React surface with the app key supplied in the {@link ReactDelegate} constructor. */
  public void loadApp() {
    if (mMainComponentName == null) {
      throw new IllegalStateException("Cannot loadApp without a main component name.");
    } else {
      loadApp(mMainComponentName);
    }
  }

  /**
   * Start the React surface for the given app key.
   *
   * @param appKey The ID of the app to load into the surface.
   */
  public void loadApp(String appKey) {
    // With Bridgeless enabled, create and start the surface
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()) {
      if (mReactSurface == null && mReactHost != null) {
        mReactSurface = mReactHost.createSurface(mActivity, appKey, mLaunchOptions);
      }
      Objects.requireNonNull(mReactSurface).start();
    } else {
      if (mReactRootView != null) {
        throw new IllegalStateException("Cannot loadApp while app is already running.");
      }
      mReactRootView = createRootView();
      if (getReactNativeHost() != null) {
        mReactRootView.startReactApplication(
            getReactNativeHost().getReactInstanceManager(), appKey, mLaunchOptions);
      }
    }
  }

  /** Stop the React surface started with {@link ReactDelegate#loadApp()}. */
  public void unloadApp() {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()) {
      if (mReactSurface != null) {
        mReactSurface.stop();
        mReactSurface = null;
      }
    } else {
      if (mReactRootView != null) {
        mReactRootView.unmountReactApplication();
        mReactRootView = null;
      }
    }
  }

  public void setReactSurface(ReactSurface reactSurface) {
    mReactSurface = reactSurface;
  }

  public void setReactRootView(ReactRootView reactRootView) {
    mReactRootView = reactRootView;
  }

  @Nullable
  public ReactRootView getReactRootView() {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()) {
      if (mReactSurface != null) {
        return (ReactRootView) mReactSurface.getView();
      } else {
        return null;
      }
    } else {
      return mReactRootView;
    }
  }

  // Not used in bridgeless
  protected ReactRootView createRootView() {
    ReactRootView reactRootView = new ReactRootView(mActivity);
    reactRootView.setIsFabric(isFabricEnabled());
    return reactRootView;
  }

  /**
   * Handles delegating the {@link Activity#onKeyUp(int, KeyEvent)} method to determine whether the
   * application should show the developer menu or should reload the React Application.
   *
   * @return true if we consume the event and either shoed the develop menu or reloaded the
   *     application.
   */
  public boolean shouldShowDevMenuOrReload(int keyCode, KeyEvent event) {
    DevSupportManager devSupportManager = getDevSupportManager();
    // shouldShowDevMenuOrReload is a Dev API and not supported in RELEASE mode.
    if (devSupportManager == null || devSupportManager instanceof ReleaseDevSupportManager) {
      return false;
    }

    if (keyCode == KeyEvent.KEYCODE_MENU) {
      devSupportManager.showDevOptionsDialog();
      return true;
    }
    boolean didDoubleTapR =
        Objects.requireNonNull(mDoubleTapReloadRecognizer)
            .didDoubleTapR(keyCode, mActivity.getCurrentFocus());
    if (didDoubleTapR) {
      devSupportManager.handleReloadJS();
      return true;
    }
    return false;
  }

  /** Get the {@link ReactNativeHost} used by this app. */
  @DeprecatedInNewArchitecture(message = "Use getReactHost()")
  private @Nullable ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @DeprecatedInNewArchitecture(message = "Use getReactHost()")
  public ReactInstanceManager getReactInstanceManager() {
    if (getReactNativeHost() == null) {
      throw new IllegalStateException("Cannot get ReactInstanceManager without a ReactNativeHost.");
    }
    return getReactNativeHost().getReactInstanceManager();
  }

  public @Nullable ReactHost getReactHost() {
    return mReactHost;
  }

  /**
   * Get the current {@link ReactContext} from ReactHost or ReactInstanceManager
   *
   * <p>Do not store a reference to this, if the React instance is reloaded or destroyed, this
   * context will no longer be valid.
   */
  public @Nullable ReactContext getCurrentReactContext() {
    if (ReactNativeNewArchitectureFeatureFlags.enableBridgelessArchitecture()) {
      if (mReactHost != null) {
        return mReactHost.getCurrentReactContext();
      } else {
        return null;
      }
    } else {
      return getReactInstanceManager().getCurrentReactContext();
    }
  }

  /**
   * Override this method if you wish to selectively toggle Fabric for a specific surface. This will
   * also control if Concurrent Root (React 18) should be enabled or not.
   *
   * @return true if Fabric is enabled for this Activity, false otherwise.
   */
  protected boolean isFabricEnabled() {
    return mFabricEnabled;
  }
}
