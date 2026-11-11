/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.views.common

import android.app.UiModeManager
import android.content.Context
import android.content.res.Configuration
import android.os.Build

/** Utility object providing static methods for working with UI mode properties from Context. */
internal object UiModeUtils {

  /**
   * Determines whether the current UI mode is dark mode
   *
   * @param context The context to check the UI mode from
   * @return true if the current UI mode is dark mode, false otherwise
   */
  @JvmStatic
  fun isDarkMode(context: Context): Boolean =
      context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK ==
          Configuration.UI_MODE_NIGHT_YES

  /**
   * Determines whether the user set the contrast of the whole UI to high. This setting exists since
   * Android 14, so this always returns false on older versions.
   *
   * @param context The context to check the contrast from
   * @return true if the contrast is set to high, false otherwise
   */
  @JvmStatic
  fun isHighContrast(context: Context): Boolean {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      return false
    }
    val uiModeManager = context.getSystemService(UiModeManager::class.java) ?: return false
    return uiModeManager.contrast >= 1f
  }
}
