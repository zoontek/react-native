/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import {ColorValue, OpaqueColorValue} from './StyleSheet';

/**
 * Select native platform color
 * The color must match the string that exists on the native platform
 *
 * @see https://reactnative.dev/docs/platformcolor#example
 */
export function PlatformColor(
  ...colors: Array<string | {fallback: string}>
): OpaqueColorValue;

export type DynamicColorTuple = {
  light: ColorValue;
  dark: ColorValue;
  highContrastLight?: ColorValue | undefined;
  highContrastDark?: ColorValue | undefined;
};

/**
 * Specify color to display depending on the current system appearance settings
 *
 * @param tuple Colors you want to use for "light mode" and "dark mode", and
 * optionally for high contrast
 */
export function DynamicColor(tuple: DynamicColorTuple): OpaqueColorValue;
