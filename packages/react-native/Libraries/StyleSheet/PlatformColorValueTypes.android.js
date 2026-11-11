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

import parsePlatformColorArgs from './parsePlatformColorArgs';

/** The actual type of the opaque NativeColorValue on Android platform */
type LocalNativeColorValue = {
  resource_paths?: Array<string>,
  fallback?: string,
  dynamic?: {
    light: ?(ColorValue | ProcessedColorValue),
    dark: ?(ColorValue | ProcessedColorValue),
    highContrastLight?: ?(ColorValue | ProcessedColorValue),
    highContrastDark?: ?(ColorValue | ProcessedColorValue),
  },
};

export const PlatformColor = (
  ...args: Array<string | {fallback: string}>
): NativeColorValue => {
  const {names, fallback} = parsePlatformColorArgs(args);
  // Raw fallback (when present) is passed to native untouched and only parsed
  // on a token miss.
  const color: LocalNativeColorValue =
    fallback == null
      ? {resource_paths: names}
      : {resource_paths: names, fallback};
  /* $FlowExpectedError[incompatible-type]
   * LocalNativeColorValue is the actual type of the opaque NativeColorValue on Android platform */
  return color as LocalNativeColorValue;
};

export type DynamicColorTuple = {
  light: ColorValue,
  dark: ColorValue,
  highContrastLight?: ColorValue,
  highContrastDark?: ColorValue,
};

export const DynamicColor = (tuple: DynamicColorTuple): ColorValue => {
  return {
    dynamic: {
      light: tuple.light,
      dark: tuple.dark,
      highContrastLight: tuple.highContrastLight,
      highContrastDark: tuple.highContrastDark,
    },
    /* $FlowExpectedError[incompatible-type]
     * LocalNativeColorValue is the actual type of the opaque NativeColorValue on Android platform */
  } as LocalNativeColorValue;
};

const _normalizeColorObject = (
  color: LocalNativeColorValue,
): ?LocalNativeColorValue => {
  if ('resource_paths' in color) {
    return color;
  } else {
    const dynamic = color.dynamic;
    if (dynamic !== undefined) {
      const normalizeColor = require('./normalizeColor').default;

      const dynamicColor: LocalNativeColorValue = {
        dynamic: {
          light: normalizeColor(dynamic.light),
          dark: normalizeColor(dynamic.dark),
          highContrastLight: normalizeColor(dynamic.highContrastLight),
          highContrastDark: normalizeColor(dynamic.highContrastDark),
        },
      };
      return dynamicColor;
    }
  }
  return null;
};

export const normalizeColorObject: (
  color: NativeColorValue,
  /* $FlowExpectedError[incompatible-type]
   * LocalNativeColorValue is the actual type of the opaque NativeColorValue on Android platform */
) => ?ProcessedColorValue = _normalizeColorObject;

const _processColorObject = (
  color: LocalNativeColorValue,
): ?LocalNativeColorValue => {
  const dynamic = color.dynamic;

  if (dynamic != null) {
    const processColor = require('./processColor').default;
    const dynamicColor: LocalNativeColorValue = {
      dynamic: {
        light: processColor(dynamic.light),
        dark: processColor(dynamic.dark),
        highContrastLight: processColor(dynamic.highContrastLight),
        highContrastDark: processColor(dynamic.highContrastDark),
      },
    };
    return dynamicColor;
  }
  return color;
};

export const processColorObject: (
  color: NativeColorValue,
  /* $FlowExpectedError[incompatible-type]
   * LocalNativeColorValue is the actual type of the opaque NativeColorValue on Android platform */
) => ?NativeColorValue = _processColorObject;
