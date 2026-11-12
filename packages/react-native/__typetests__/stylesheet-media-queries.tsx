/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @format
 */

import * as React from 'react';
import {StyleSheet, Text, View} from 'react-native';

const DARK = '@media (prefers-color-scheme: dark)';
const MORE_CONTRAST = '@media (prefers-contrast: more)';

const styles = StyleSheet.create({
  container: {
    width: {default: 800, [DARK]: '100%'},
    backgroundColor: {
      default: 'white',
      [DARK]: {default: 'black', [MORE_CONTRAST]: 'blue'},
    },
  },
  text: {
    color: {default: 'black', [DARK]: 'white'},
  },
  invalid: {
    // Should error: the values must have the type of the style prop
    // @ts-expect-error
    width: {default: 800, [DARK]: true},
  },
});

export function App() {
  return (
    <View style={[styles.container, {opacity: {default: 1, [DARK]: 0.5}}]}>
      <Text style={styles.text}>Hello</Text>
    </View>
  );
}
