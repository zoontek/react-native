/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.fabric

import android.app.UiModeManager
import android.content.ComponentCallbacks
import android.content.Context
import android.content.res.Configuration
import android.database.ContentObserver
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.facebook.react.views.common.UiModeUtils
import java.util.Collections
import java.util.WeakHashMap

/**
 * Reads the media features that conditional props are matched against (for example with `@media
 * (prefers-color-scheme: dark)`), and reports them when they change.
 */
internal class MediaFeaturesObserver(
    private val reactContext: ReactApplicationContext,
    private val listener: Listener,
) {

  fun interface Listener {
    /**
     * @param colorScheme one of [COLOR_SCHEME_LIGHT] or [COLOR_SCHEME_DARK]
     * @param contrast one of [CONTRAST_NO_PREFERENCE], [CONTRAST_LESS] or [CONTRAST_MORE]
     */
    fun onMediaFeaturesChanged(colorScheme: Int, contrast: Int)
  }

  private var lastColorScheme: Int? = null
  private var lastContrast: Int? = null

  private val componentCallbacks =
      object : ComponentCallbacks {
        override fun onConfigurationChanged(newConfig: Configuration) {
          update()
        }

        @Deprecated("Deprecated in Java") override fun onLowMemory() = Unit
      }

  private val highTextContrastObserver =
      object : ContentObserver(UiThreadUtil.getUiThreadHandler()) {
        override fun onChange(selfChange: Boolean) {
          update()
        }

        override fun onChange(selfChange: Boolean, uri: Uri?) {
          update()
        }
      }

  private var contrastChangeListener: Any? = null

  fun start() {
    activeObservers.add(this)
    reactContext.registerComponentCallbacks(componentCallbacks)
    reactContext.contentResolver.registerContentObserver(
        Settings.Secure.getUriFor(HIGH_TEXT_CONTRAST_ENABLED),
        false,
        highTextContrastObserver,
    )
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      addContrastChangeListener()
    }
    update()
  }

  fun stop() {
    activeObservers.remove(this)
    reactContext.unregisterComponentCallbacks(componentCallbacks)
    reactContext.contentResolver.unregisterContentObserver(highTextContrastObserver)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      removeContrastChangeListener()
    }
  }

  @Synchronized
  fun update(context: Context? = null) {
    // The activity context reflects `AppCompatDelegate.setDefaultNightMode()`, which
    // `Appearance.setColorScheme()` uses.
    val currentContext = context ?: reactContext.currentActivity ?: reactContext
    val colorScheme =
        if (UiModeUtils.isDarkMode(currentContext)) COLOR_SCHEME_DARK else COLOR_SCHEME_LIGHT
    val contrast = readContrast()

    if (colorScheme != lastColorScheme || contrast != lastContrast) {
      lastColorScheme = colorScheme
      lastContrast = contrast
      listener.onMediaFeaturesChanged(colorScheme, contrast)
    }
  }

  private fun readContrast(): Int {
    val isHighTextContrastEnabled =
        Settings.Secure.getInt(reactContext.contentResolver, HIGH_TEXT_CONTRAST_ENABLED, 0) != 0
    val contrastLevel =
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) readContrastLevel()
        else 0f
    return when {
      isHighTextContrastEnabled || contrastLevel > 0f -> CONTRAST_MORE
      contrastLevel < 0f -> CONTRAST_LESS
      else -> CONTRAST_NO_PREFERENCE
    }
  }

  @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
  private fun readContrastLevel(): Float =
      reactContext.getSystemService(UiModeManager::class.java)?.contrast ?: 0f

  @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
  private fun addContrastChangeListener() {
    val uiModeManager = reactContext.getSystemService(UiModeManager::class.java) ?: return
    val contrastListener = UiModeManager.ContrastChangeListener { update() }
    uiModeManager.addContrastChangeListener(reactContext.mainExecutor, contrastListener)
    contrastChangeListener = contrastListener
  }

  @RequiresApi(Build.VERSION_CODES.UPSIDE_DOWN_CAKE)
  private fun removeContrastChangeListener() {
    val contrastListener = contrastChangeListener as? UiModeManager.ContrastChangeListener ?: return
    reactContext
        .getSystemService(UiModeManager::class.java)
        ?.removeContrastChangeListener(contrastListener)
    contrastChangeListener = null
  }

  companion object {
    // These values match `FabricUIManagerBinding::updateMediaFeatures`.
    const val COLOR_SCHEME_LIGHT: Int = 0
    const val COLOR_SCHEME_DARK: Int = 1
    const val CONTRAST_NO_PREFERENCE: Int = 0
    const val CONTRAST_LESS: Int = 1
    const val CONTRAST_MORE: Int = 2

    private const val HIGH_TEXT_CONTRAST_ENABLED = "high_text_contrast_enabled"

    private val activeObservers: MutableSet<MediaFeaturesObserver> =
        Collections.synchronizedSet(Collections.newSetFromMap(WeakHashMap()))

    /**
     * Call this when the configuration of an activity changes: changes made with
     * `AppCompatDelegate.setDefaultNightMode()` only reach the activity.
     */
    fun onConfigurationChanged(context: Context) {
      synchronized(activeObservers) { activeObservers.toList() }.forEach { it.update(context) }
    }
  }
}
