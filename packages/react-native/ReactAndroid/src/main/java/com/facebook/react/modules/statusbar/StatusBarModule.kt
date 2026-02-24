/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.modules.statusbar

import android.graphics.Color
import android.view.Window
import android.view.WindowManager
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import com.facebook.common.logging.FLog
import com.facebook.fbreact.specs.NativeStatusBarManagerAndroidSpec
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.bridge.WindowEventListener
import com.facebook.react.common.ReactConstants
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.uimanager.DisplayMetricsHolder.getStatusBarHeightPx
import com.facebook.react.uimanager.PixelUtil
import com.facebook.react.views.view.isEdgeToEdgeFeatureFlagOn
import com.facebook.react.views.view.setStatusBarColor
import com.facebook.react.views.view.setStatusBarStyle
import com.facebook.react.views.view.setStatusBarTranslucency
import com.facebook.react.views.view.setStatusBarVisibility

/** [NativeModule] that allows changing the appearance of the status bar. */
@ReactModule(name = NativeStatusBarManagerAndroidSpec.NAME)
internal class StatusBarModule(reactContext: ReactApplicationContext?) :
    NativeStatusBarManagerAndroidSpec(reactContext), WindowEventListener {

  private val extrasWindows = mutableSetOf<Window>()

  private object CurrentState {
    var color = Color.BLACK
    var hidden = false
    var style = "default"
    var translucent = false
  }

  init {
    reactApplicationContext.addWindowEventListener(this)
    reactApplicationContext.currentActivity?.window?.let { readInitialState(it) }
  }

  override fun invalidate() {
    super.invalidate()
    reactApplicationContext.removeWindowEventListener(this)
  }

  override fun onWindowCreated(window: Window) {
    extrasWindows.add(window)

    window.setStatusBarColor(CurrentState.color, false)
    window.setStatusBarVisibility(CurrentState.hidden)
    window.setStatusBarStyle(CurrentState.style)
    window.setStatusBarTranslucency(CurrentState.translucent)
  }

  override fun onWindowDestroyed(window: Window) {
    extrasWindows.remove(window)
  }

  @Suppress("DEPRECATION")
  fun readInitialState(window: Window) {
    val controller = WindowCompat.getInsetsController(window, window.decorView)
    val insets = ViewCompat.getRootWindowInsets(window.decorView)
    val visible = insets?.isVisible(WindowInsetsCompat.Type.statusBars()) ?: true

    CurrentState.apply {
      color = window.statusBarColor
      hidden = !visible
      style = if (controller.isAppearanceLightStatusBars) "dark-content" else "light-content"
      translucent =
          (window.attributes.flags and WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS) != 0
    }
  }

  @Suppress("DEPRECATION")
  override fun getTypedExportedConstants(): Map<String, Any> {
    val currentActivity = reactApplicationContext.currentActivity
    val statusBarColor =
        currentActivity?.window?.statusBarColor?.let { color ->
          String.format("#%06X", 0xFFFFFF and color)
        } ?: "black"
    return mapOf(
        HEIGHT_KEY to PixelUtil.toDIPFromPixel(getStatusBarHeightPx(currentActivity).toFloat()),
        DEFAULT_BACKGROUND_COLOR_KEY to statusBarColor,
    )
  }

  override fun setColor(colorDouble: Double, animated: Boolean) {
    CurrentState.color = colorDouble.toInt()
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is null.",
      )
      return
    }
    if (isEdgeToEdgeFeatureFlagOn) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is edge-to-edge.",
      )
      return
    }
    UiThreadUtil.runOnUiThread {
      activity.window?.setStatusBarColor(CurrentState.color, animated)
      extrasWindows.forEach { it.setStatusBarColor(CurrentState.color, animated) }
    }
  }

  override fun setTranslucent(translucent: Boolean) {
    CurrentState.translucent = translucent
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is null.",
      )
      return
    }
    if (isEdgeToEdgeFeatureFlagOn) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is edge-to-edge.",
      )
      return
    }
    UiThreadUtil.runOnUiThread {
      activity.window?.setStatusBarTranslucency(CurrentState.translucent)
      extrasWindows.forEach { it.setStatusBarTranslucency(CurrentState.translucent) }
    }
  }

  override fun setHidden(hidden: Boolean) {
    CurrentState.hidden = hidden
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is null.",
      )
      return
    }
    UiThreadUtil.runOnUiThread {
      activity.window?.setStatusBarVisibility(CurrentState.hidden)
      extrasWindows.forEach { it.setStatusBarVisibility(CurrentState.hidden) }
    }
  }

  override fun setStyle(style: String?) {
    CurrentState.style = style ?: "default"
    val activity = reactApplicationContext.getCurrentActivity()
    if (activity == null) {
      FLog.w(
          ReactConstants.TAG,
          "StatusBarModule: Ignored status bar change, current activity is null.",
      )
      return
    }
    UiThreadUtil.runOnUiThread {
      activity.window?.setStatusBarStyle(CurrentState.style)
      extrasWindows.forEach { it.setStatusBarStyle(CurrentState.style) }
    }
  }

  companion object {
    private const val HEIGHT_KEY = "HEIGHT"
    private const val DEFAULT_BACKGROUND_COLOR_KEY = "DEFAULT_BACKGROUND_COLOR"
    const val NAME: String = NativeStatusBarManagerAndroidSpec.NAME
  }
}
