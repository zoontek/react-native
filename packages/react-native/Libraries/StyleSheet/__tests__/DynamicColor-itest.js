/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 * @oncall react_native
 */

import '@react-native/fantom/src/setUpDefaultReactNativeEnvironment';

import type {ColorValue} from 'react-native';

import * as Fantom from '@react-native/fantom';
import * as React from 'react';
import {DynamicColor, View} from 'react-native';

// Fantom has no appearance settings, so a DynamicColor always renders its
// light variant. Dark mode and high contrast are covered in RNTester.

function renderedBackgroundColor(color: ColorValue): unknown {
  const root = Fantom.createRoot();
  Fantom.runTask(() => {
    root.render(<View style={{backgroundColor: color}} />);
  });
  return root.getRenderedOutput({props: ['backgroundColor']}).toJSX();
}

describe('DynamicColor', () => {
  it('renders the light variant', () => {
    expect(
      renderedBackgroundColor(DynamicColor({light: 'red', dark: 'blue'})),
    ).toEqual(<rn-view backgroundColor="rgba(255, 0, 0, 1)" />);
  });

  it('renders the light variant when high contrast variants are set', () => {
    expect(
      renderedBackgroundColor(
        DynamicColor({
          light: 'red',
          dark: 'blue',
          highContrastLight: 'green',
          highContrastDark: 'yellow',
        }),
      ),
    ).toEqual(<rn-view backgroundColor="rgba(255, 0, 0, 1)" />);
  });
});
