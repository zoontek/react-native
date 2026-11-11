/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import '@react-native/fantom/src/setUpDefaultReactNativeEnvironment';

const {OS} = require('../../Utilities/Platform').default;
const normalizeColor = require('../normalizeColor').default;
const {DynamicColor, PlatformColor} = require('../PlatformColorValueTypes');

it('forwards calls to @react-native/normalize-colors', () => {
  // normalizeColor delegates string and number inputs to
  // @react-native/normalize-colors, which returns a 0xrrggbbaa integer.
  expect(normalizeColor('#abcdef')).toBe(0xabcdefff);
});

describe('iOS', () => {
  if (OS === 'ios') {
    it('should normalize iOS PlatformColor colors', () => {
      const color = PlatformColor('systemRedColor');
      const normalizedColor = normalizeColor(color);
      const expectedColor = {semantic: ['systemRedColor']};
      expect(normalizedColor).toEqual(expectedColor);
    });

    it('should normalize iOS Dynamic colors with named colors', () => {
      const color = DynamicColor({light: 'black', dark: 'white'});
      const normalizedColor = normalizeColor(color);
      const expectedColor = {
        dynamic: {
          light: normalizeColor('black'),
          dark: normalizeColor('white'),
        },
      };
      expect(normalizedColor).toEqual(expectedColor);
    });

    it('should normalize iOS Dynamic colors with accessible colors', () => {
      const color = DynamicColor({
        light: 'black',
        dark: 'white',
        highContrastLight: 'red',
        highContrastDark: 'blue',
      });
      const normalizedColor = normalizeColor(color);
      const expectedColor = {
        dynamic: {
          light: normalizeColor('black'),
          dark: normalizeColor('white'),
          highContrastLight: normalizeColor('red'),
          highContrastDark: normalizeColor('blue'),
        },
      };
      expect(normalizedColor).toEqual(expectedColor);
    });

    it('should normalize iOS Dynamic colors with PlatformColor colors', () => {
      const color = DynamicColor({
        light: PlatformColor('systemBlackColor'),
        dark: PlatformColor('systemWhiteColor'),
      });
      const normalizedColor = normalizeColor(color);
      const expectedColor = {
        dynamic: {
          light: {semantic: ['systemBlackColor']},
          dark: {semantic: ['systemWhiteColor']},
        },
      };
      expect(normalizedColor).toEqual(expectedColor);
    });
  }
});

describe('Android', () => {
  if (OS === 'android') {
    it('should normalize Android PlatformColor colors', () => {
      const color = PlatformColor('?attr/colorPrimary');
      const normalizedColor = normalizeColor(color);
      const expectedColor = {resource_paths: ['?attr/colorPrimary']};
      expect(normalizedColor).toEqual(expectedColor);
    });

    it('should normalize Android Dynamic colors with accessible colors', () => {
      const color = DynamicColor({
        light: 'black',
        dark: 'white',
        highContrastLight: 'red',
        highContrastDark: 'blue',
      });
      const normalizedColor = normalizeColor(color);
      const expectedColor = {
        dynamic: {
          light: normalizeColor('black'),
          dark: normalizeColor('white'),
          highContrastLight: normalizeColor('red'),
          highContrastDark: normalizeColor('blue'),
        },
      };
      expect(normalizedColor).toEqual(expectedColor);
    });

    it('should normalize Android Dynamic colors with PlatformColor colors', () => {
      const color = DynamicColor({
        light: PlatformColor('?attr/colorPrimary'),
        dark: PlatformColor('?attr/colorAccent'),
      });
      const normalizedColor = normalizeColor(color);
      const expectedColor = {
        dynamic: {
          light: {resource_paths: ['?attr/colorPrimary']},
          dark: {resource_paths: ['?attr/colorAccent']},
          highContrastLight: undefined,
          highContrastDark: undefined,
        },
      };
      expect(normalizedColor).toEqual(expectedColor);
    });
  }
});
