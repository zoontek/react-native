/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {ProcessedColorValue} from './processColor';
import type {ColorValue, NativeColorValue} from './StyleSheet';

import Platform from '../Utilities/Platform';
import parsePlatformColorArgs from './parsePlatformColorArgs';

type DynamicColorVariant = ?(ColorValue | ProcessedColorValue);

/** The actual type of the opaque NativeColorValue on iOS and Android */
type LocalNativeColorValue = {
  // PlatformColor names, read by iOS
  semantic?: Array<string>,
  // PlatformColor names, read by Android
  resource_paths?: Array<string>,
  fallback?: string,
  dynamic?: {
    light: DynamicColorVariant,
    dark: DynamicColorVariant,
    highContrastLight?: DynamicColorVariant,
    highContrastDark?: DynamicColorVariant,
  },
};

/**
 * Select native platform color
 * The color must match the string that exists on the native platform
 *
 * @see https://reactnative.dev/docs/platformcolor#example
 */
export function PlatformColor(
  ...names: Array<string | {fallback: string}>
): NativeColorValue {
  const parsed = parsePlatformColorArgs(names);
  const fallback = parsed.fallback;
  const color: LocalNativeColorValue =
    Platform.OS === 'ios'
      ? {semantic: parsed.names}
      : {resource_paths: parsed.names};
  // Raw fallback (when present) is passed to native untouched and only parsed
  // on a token miss.
  if (fallback != null) {
    color.fallback = fallback;
  }
  /* $FlowExpectedError[incompatible-type]
   * LocalNativeColorValue is the actual type of the opaque NativeColorValue */
  return color as LocalNativeColorValue;
}

export type DynamicColorTuple = {
  light: ColorValue,
  dark: ColorValue,
  highContrastLight?: ColorValue,
  highContrastDark?: ColorValue,
};

/**
 * Specify color to display depending on the current system appearance settings
 *
 * @param tuple Colors you want to use for "light mode" and "dark mode", and
 * optionally for high contrast. The high contrast colors are used when the
 * system increases contrast (iOS "Increase Contrast", Android 14+ "Contrast").
 */
export function DynamicColor(tuple: DynamicColorTuple): ColorValue {
  const color: LocalNativeColorValue = {
    dynamic: {
      light: tuple.light,
      dark: tuple.dark,
      highContrastLight: tuple.highContrastLight,
      highContrastDark: tuple.highContrastDark,
    },
  };
  /* $FlowExpectedError[incompatible-type]
   * LocalNativeColorValue is the actual type of the opaque NativeColorValue */
  return color as LocalNativeColorValue;
}

const _normalizeColorObject = (
  color: LocalNativeColorValue,
): ?LocalNativeColorValue => {
  if (Platform.OS === 'ios' ? 'semantic' in color : 'resource_paths' in color) {
    return color;
  }

  const dynamic = color.dynamic;
  if (dynamic != null) {
    // Required lazily, as normalizeColor requires this module
    const normalizeColor = require('./normalizeColor').default;

    return {
      dynamic: {
        light: normalizeColor(dynamic.light),
        dark: normalizeColor(dynamic.dark),
        highContrastLight: normalizeColor(dynamic.highContrastLight),
        highContrastDark: normalizeColor(dynamic.highContrastDark),
      },
    };
  }
  return null;
};

export const normalizeColorObject: (
  color: NativeColorValue,
  /* $FlowExpectedError[incompatible-type]
   * LocalNativeColorValue is the actual type of the opaque NativeColorValue */
) => ?ProcessedColorValue = _normalizeColorObject;

const _processColorObject = (
  color: LocalNativeColorValue,
): ?LocalNativeColorValue => {
  const dynamic = color.dynamic;
  if (dynamic != null) {
    // Required lazily, as processColor requires this module
    const processColor = require('./processColor').default;

    return {
      dynamic: {
        light: processColor(dynamic.light),
        dark: processColor(dynamic.dark),
        highContrastLight: processColor(dynamic.highContrastLight),
        highContrastDark: processColor(dynamic.highContrastDark),
      },
    };
  }
  return color;
};

export const processColorObject: (
  color: NativeColorValue,
  /* $FlowExpectedError[incompatible-type]
   * LocalNativeColorValue is the actual type of the opaque NativeColorValue */
) => ?NativeColorValue = _processColorObject;
