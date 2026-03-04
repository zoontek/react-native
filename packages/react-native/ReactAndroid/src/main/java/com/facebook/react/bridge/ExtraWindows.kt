/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.bridge

import android.view.Window
import com.facebook.infer.annotation.ThreadConfined
import java.lang.ref.WeakReference
import java.util.concurrent.CopyOnWriteArraySet

/**
 * Listener for receiving extra window creation and destruction events.
 *
 * This allows modules to react to new windows being added or removed, such as Dialog windows
 * registered by Modal components. Modules like StatusBarModule can implement this interface to
 * apply their configuration to all active windows.
 *
 * Third-party libraries can both implement this listener and emit window events through
 * [ReactContext.registerExtraWindow].
 */
public interface ExtraWindowListener {

  /** Called when a new [Window] is registered (e.g. a Dialog window for a Modal). */
  public fun onExtraWindowRegistered(window: Window)
}

/**
 * Tracks extra [Window] instances (e.g. Dialog windows registered by Modal components) and notifies
 * registered [ExtraWindowListener]s when new windows are added.
 *
 * All references are held as [WeakReference]s so that windows and listeners can be garbage
 * collected when no longer in use.
 */
public class ExtraWindows {
  private val listeners = CopyOnWriteArraySet<WeakReference<ExtraWindowListener>>()
  private val windows = CopyOnWriteArraySet<WeakReference<Window>>()

  /** SAM interface for handling runtime exceptions in Java-friendly way */
  public fun interface AddExtraWindowCallback {
    public fun onError(e: RuntimeException)
  }

  /** Adds a [listener] if it is not already registered. */
  public fun addListener(listener: ExtraWindowListener) {
    if (listeners.none { it.get() === listener }) {
      listeners.add(WeakReference(listener))
    }
  }

  /** Removes a [listener] and prunes any garbage-collected entries. */
  public fun removeListener(listener: ExtraWindowListener) {
    listeners.removeAll { it.get() == null || it.get() === listener }
  }

  /**
   * Registers an extra [window] and notifies all listeners. Must be called on the UI thread.
   *
   * If a listener throws a [RuntimeException], the exception is forwarded to [callback] and
   * remaining listeners are still notified.
   */
  @ThreadConfined(ThreadConfined.UI)
  public fun register(window: Window, callback: AddExtraWindowCallback) {
    UiThreadUtil.assertOnUiThread()

    if (windows.none { it.get() === window }) {
      windows.add(WeakReference(window))
    }

    listeners.forEach {
      try {
        it.get()?.onExtraWindowRegistered(window)
      } catch (e: RuntimeException) {
        callback.onError(e)
      }
    }
  }

  /** Returns a snapshot of all currently alive extra windows, pruning collected references. */
  public fun getAll(): Set<Window> {
    windows.removeAll { it.get() == null }
    return windows.mapNotNull { it.get() }.toSet()
  }
}
