import React from 'react';
import { StyleSheet } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DebugMenu, DebugMenuProvider } from '../src';

jest.mock('../src/optional', () => ({
  getScreens: () => null,
  getSafeArea: () => null,
  getGestureHandler: () => null,
  useSafeInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

type Node = { type: unknown; props: Record<string, unknown> };

const styleOf = (node: Node) =>
  StyleSheet.flatten(node.props.style as never) as Record<string, unknown>;

function openMenu(direction?: 'ltr' | 'rtl' | 'inherit'): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(
      <DebugMenuProvider enabled plugins={[]} direction={direction}>
        {null}
      </DebugMenuProvider>,
    );
  });
  act(() => DebugMenu.open());
  return renderer!;
}

const hostViews = (renderer: ReactTestRenderer) =>
  renderer.root.findAll(
    (node: Node) => node.type === 'View' && node.props.style != null,
  );

describe('menu direction', () => {
  let renderer: ReactTestRenderer | null = null;
  afterEach(() => {
    act(() => renderer?.unmount());
    renderer = null;
  });

  it('defaults to LTR so RTL apps still get a left-to-right menu', () => {
    renderer = openMenu();
    expect(
      hostViews(renderer).some((node) => styleOf(node).direction === 'ltr'),
    ).toBe(true);
  });

  it('mirrors the back icon in RTL', () => {
    renderer = openMenu('rtl');
    const mirrored = hostViews(renderer).filter((node) => {
      const transform = styleOf(node).transform as
        Array<Record<string, unknown>> | undefined;
      return transform?.some((step) => step.scaleX === -1);
    });
    expect(mirrored).toHaveLength(1);
  });
});
