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

import type {HostInstance} from 'react-native';

import * as Fantom from '@react-native/fantom';
import * as React from 'react';
import {createRef, memo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

const DARK = '@media (prefers-color-scheme: dark)';
const MORE_CONTRAST = '@media (prefers-contrast: more)';
const DARK_AND_MORE_CONTRAST =
  '@media (prefers-color-scheme: dark) and (prefers-contrast: more)';

const styles = StyleSheet.create({
  box: {
    backgroundColor: {default: 'white', [DARK]: 'black'},
  },
  contrast: {
    backgroundColor: {
      default: 'white',
      [DARK]: 'black',
      [MORE_CONTRAST]: 'red',
    },
  },
  nested: {
    backgroundColor: {
      default: 'white',
      [DARK]: {default: 'black', [MORE_CONTRAST]: 'blue'},
    },
  },
  combined: {
    backgroundColor: {
      default: 'white',
      [DARK_AND_MORE_CONTRAST]: 'blue',
    },
  },
  width: {
    width: {default: 10, [DARK]: 20},
    height: 10,
  },
  text: {
    color: {default: 'black', [DARK]: 'white'},
  },
});

function setMediaFeatures(
  mediaFeatures: Parameters<typeof Fantom.setMediaFeatures>[0],
) {
  Fantom.runTask(() => {
    Fantom.setMediaFeatures(mediaFeatures);
  });
}

function renderedBackgroundColor(root: Fantom.Root): React.Node {
  return root.getRenderedOutput({props: ['backgroundColor']}).toJSX();
}

describe('media queries in styles', () => {
  afterEach(() => {
    setMediaFeatures({});
  });

  it('uses the default value when no condition matches', () => {
    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(<View style={styles.box} />);
    });

    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(255, 255, 255, 1)" />,
    );
  });

  it('uses the value of a matching condition on the first render', () => {
    setMediaFeatures({colorScheme: 'dark'});

    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(<View style={styles.box} />);
    });

    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(0, 0, 0, 1)" />,
    );
  });

  it('updates mounted views when the media features change, without a React render', () => {
    let renderCount = 0;
    const Box = memo(function Box() {
      renderCount++;
      return <View style={styles.box} />;
    });

    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(<Box />);
    });
    expect(renderCount).toBe(1);

    setMediaFeatures({colorScheme: 'dark'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(0, 0, 0, 1)" />,
    );

    setMediaFeatures({colorScheme: 'light'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(255, 255, 255, 1)" />,
    );
    expect(renderCount).toBe(1);
  });

  it('keeps the resolved value when React renders the view again after a change', () => {
    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(<View style={styles.box} nativeID="first" />);
    });

    setMediaFeatures({colorScheme: 'dark'});

    Fantom.runTask(() => {
      root.render(<View style={styles.box} nativeID="second" />);
    });
    expect(
      root.getRenderedOutput({props: ['backgroundColor', 'nativeID']}).toJSX(),
    ).toEqual(<rn-view backgroundColor="rgba(0, 0, 0, 1)" nativeID="second" />);
  });

  it('keeps the resolved value of views that React does not render again after a change', () => {
    const Box = memo(function Box() {
      return <View style={styles.box} />;
    });

    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(
        <View nativeID="first">
          <Box />
        </View>,
      );
    });

    setMediaFeatures({colorScheme: 'dark'});

    Fantom.runTask(() => {
      root.render(
        <View nativeID="second">
          <Box />
        </View>,
      );
    });
    expect(
      root.getRenderedOutput({props: ['backgroundColor', 'nativeID']}).toJSX(),
    ).toEqual(
      <rn-view nativeID="second">
        <rn-view backgroundColor="rgba(0, 0, 0, 1)" />
      </rn-view>,
    );
  });

  it('matches prefers-contrast, and the last matching condition wins', () => {
    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(<View style={styles.contrast} />);
    });

    setMediaFeatures({colorScheme: 'dark', contrast: 'more'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(255, 0, 0, 1)" />,
    );

    setMediaFeatures({colorScheme: 'dark', contrast: 'no-preference'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(0, 0, 0, 1)" />,
    );
  });

  it('supports nested conditions', () => {
    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(<View style={styles.nested} />);
    });

    setMediaFeatures({colorScheme: 'light', contrast: 'more'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(255, 255, 255, 1)" />,
    );

    setMediaFeatures({colorScheme: 'dark', contrast: 'more'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(0, 0, 255, 1)" />,
    );
  });

  it('supports media features combined with and', () => {
    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(<View style={styles.combined} />);
    });

    setMediaFeatures({colorScheme: 'dark'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(255, 255, 255, 1)" />,
    );

    setMediaFeatures({colorScheme: 'dark', contrast: 'more'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(0, 0, 255, 1)" />,
    );

    setMediaFeatures({colorScheme: 'light', contrast: 'more'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(255, 255, 255, 1)" />,
    );
  });

  it('updates the layout of conditional layout props', () => {
    const ref = createRef<HostInstance>();
    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(<View ref={ref} style={styles.width} />);
    });
    expect(ref.current?.getBoundingClientRect().width).toBe(10);

    setMediaFeatures({colorScheme: 'dark'});
    expect(ref.current?.getBoundingClientRect().width).toBe(20);
  });

  it('stops updating a prop when React replaces its conditional value with a plain value', () => {
    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(<View style={styles.box} />);
    });
    Fantom.runTask(() => {
      root.render(<View style={{backgroundColor: 'red'}} />);
    });

    setMediaFeatures({colorScheme: 'dark'});
    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(255, 0, 0, 1)" />,
    );
  });

  it('resolves conditional values of inline styles and Text', () => {
    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(
        <View style={{opacity: {default: 1, [DARK]: 0.5}}}>
          <Text style={styles.text}>Hello</Text>
        </View>,
      );
    });

    setMediaFeatures({colorScheme: 'dark'});
    expect(
      root.getRenderedOutput({props: ['opacity', 'foregroundColor']}).toJSX(),
    ).toEqual(
      <rn-view opacity="0.5">
        <rn-paragraph foregroundColor="rgba(255, 255, 255, 1)">
          Hello
        </rn-paragraph>
      </rn-view>,
    );
  });

  it('never matches an unsupported media query', () => {
    const root = Fantom.createRoot();
    Fantom.runTask(() => {
      root.render(
        <View
          style={{
            backgroundColor: {
              default: 'white',
              '@media (max-width: 800px)': 'black',
            },
          }}
        />,
      );
    });

    expect(renderedBackgroundColor(root)).toEqual(
      <rn-view backgroundColor="rgba(255, 255, 255, 1)" />,
    );
  });
});
