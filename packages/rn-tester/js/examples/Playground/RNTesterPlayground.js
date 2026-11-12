/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

import type {RNTesterModuleExample} from '../../types/RNTesterTypes';
import type {ColorSchemeOverride} from 'react-native/Libraries/Utilities/Appearance';

import RNTesterText from '../../components/RNTesterText';
import RNTOption from '../../components/RNTOption';
import * as React from 'react';
import {memo, useEffect, useRef, useState} from 'react';
import {
  Appearance,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

const DARK = '@media (prefers-color-scheme: dark)';
const LESS_CONTRAST = '@media (prefers-contrast: less)';
const MORE_CONTRAST = '@media (prefers-contrast: more)';
const DARK_AND_MORE_CONTRAST =
  '@media (prefers-color-scheme: dark) and (prefers-contrast: more)';

const CONTRAST_SETTING =
  Platform.OS === 'ios'
    ? 'Settings > Accessibility > Display & Text Size > Increase Contrast'
    : 'Settings > Accessibility > Contrast (Android 14+), or High contrast text';

const COLOR_SCHEME_OPTIONS: ReadonlyArray<{
  label: string,
  value: ColorSchemeOverride,
}> = [
  {label: 'System', value: 'unspecified'},
  {label: 'Light', value: 'light'},
  {label: 'Dark', value: 'dark'},
];

function ColorSchemeSelector() {
  const colorScheme = useColorScheme();
  const [override, setOverride] = useState<ColorSchemeOverride>('unspecified');
  const hasChangedOverride = useRef(false);

  useEffect(() => {
    return () => {
      // Do not keep the override after leaving the playground.
      if (hasChangedOverride.current) {
        Appearance.setColorScheme('unspecified');
      }
    };
  }, []);

  return (
    <View style={styles.section}>
      <RNTesterText style={styles.title}>Color scheme</RNTesterText>
      <View style={styles.options}>
        {COLOR_SCHEME_OPTIONS.map(option => (
          <RNTOption
            key={option.value}
            label={option.label}
            selected={override === option.value}
            onPress={() => {
              hasChangedOverride.current = true;
              setOverride(option.value);
              Appearance.setColorScheme(option.value);
            }}
          />
        ))}
      </View>
      <RNTesterText style={styles.note}>
        useColorScheme(): {colorScheme ?? 'null'}
      </RNTesterText>
      <RNTesterText style={styles.note}>
        To change the contrast: {CONTRAST_SETTING}.
      </RNTesterText>
    </View>
  );
}

function Example({
  title,
  description,
  children,
}: {
  title: string,
  description: string,
  children: React.Node,
}) {
  return (
    <View style={styles.section}>
      <RNTesterText style={styles.title}>{title}</RNTesterText>
      <RNTesterText style={styles.note}>{description}</RNTesterText>
      {children}
    </View>
  );
}

// This component renders once. Its colors still change with the media
// features, because native resolves the media queries.
const MemoizedBox = memo(function MemoizedBox() {
  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <View style={examples.colorScheme}>
      <Text style={examples.colorSchemeText}>
        React renders: {renderCount.current}
      </Text>
    </View>
  );
});

function Playground() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ColorSchemeSelector />

      <Example
        title="prefers-color-scheme"
        description="White box with black text in light mode, black box with white text in dark mode.">
        <View style={examples.colorScheme}>
          <Text style={examples.colorSchemeText}>Hello</Text>
        </View>
      </Example>

      <Example
        title="prefers-contrast"
        description="Gray border by default, a thin light border with less contrast, a thick black border with more contrast.">
        <View style={examples.contrast} />
      </Example>

      <Example
        title="Combined with and"
        description="Red only in dark mode with more contrast. Gray otherwise.">
        <View style={examples.combined} />
      </Example>

      <Example
        title="Nested conditions"
        description="Light blue in light mode. In dark mode: dark blue, or yellow with more contrast.">
        <View style={examples.nested} />
      </Example>

      <Example
        title="Layout props"
        description="Half the width in light mode, the full width in dark mode.">
        <View style={examples.layout} />
      </Example>

      <Example
        title="Inline style"
        description="Opacity 1 in light mode, 0.4 in dark mode.">
        <View
          style={[
            examples.box,
            {
              backgroundColor: 'orange',
              opacity: {default: 1, [DARK]: 0.4},
            },
          ]}
        />
      </Example>

      <Example
        title="Without a React render"
        description="The counter stays at 1 when the media features change.">
        <MemoizedBox />
      </Example>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
    gap: 20,
  },
  section: {
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  note: {
    fontSize: 12,
  },
  options: {
    flexDirection: 'row',
    gap: 8,
  },
});

const examples = StyleSheet.create({
  box: {
    height: 50,
    borderRadius: 8,
  },
  colorScheme: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'gray',
    backgroundColor: {default: 'white', [DARK]: 'black'},
  },
  colorSchemeText: {
    color: {default: 'black', [DARK]: 'white'},
  },
  contrast: {
    height: 50,
    borderRadius: 8,
    borderWidth: {default: 2, [LESS_CONTRAST]: 1, [MORE_CONTRAST]: 6},
    borderColor: {
      default: 'gray',
      [LESS_CONTRAST]: 'lightgray',
      [MORE_CONTRAST]: 'black',
    },
  },
  combined: {
    height: 50,
    borderRadius: 8,
    backgroundColor: {default: 'gray', [DARK_AND_MORE_CONTRAST]: 'red'},
  },
  nested: {
    height: 50,
    borderRadius: 8,
    backgroundColor: {
      default: 'lightblue',
      [DARK]: {default: 'darkblue', [MORE_CONTRAST]: 'yellow'},
    },
  },
  layout: {
    height: 50,
    borderRadius: 8,
    backgroundColor: 'green',
    width: {default: '50%', [DARK]: '100%'},
  },
});

export default {
  title: 'Playground',
  name: 'playground',
  description: 'Test out new features and ideas.',
  render: (): React.Node => <Playground />,
} as RNTesterModuleExample;
