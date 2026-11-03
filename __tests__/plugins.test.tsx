import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { actionsPlugin } from '../src/actions';
import { environmentPlugin } from '../src/environment';

jest.mock('../src/optional', () => ({
  getScreens: () => null,
  getSafeArea: () => null,
  useSafeInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

type Node = { props: Record<string, unknown>; children?: unknown[] };

function texts(renderer: ReactTestRenderer): string[] {
  return renderer.root
    .findAll((node: Node) => typeof node.props.children === 'string')
    .map((node: Node) => node.props.children as string);
}

function render(Component: React.ComponentType): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(<Component />);
  });
  return renderer!;
}

describe('actionsPlugin', () => {
  it('renders sections with titles, notes and custom button colors', () => {
    const plugin = actionsPlugin({
      sections: [
        {
          title: 'Store review',
          note: 'orders: 2',
          actions: [{ label: 'Request', onPress: () => undefined }],
        },
        {
          title: 'Toasts',
          actions: [
            { label: 'Warning', color: '#F85E00', onPress: () => undefined },
          ],
        },
      ],
    });
    const renderer = render(plugin.component);

    expect(texts(renderer)).toEqual(
      expect.arrayContaining(['Store review', 'orders: 2', 'Toasts']),
    );

    // Header back button, "Request", "Warning" — the last one carries the color.
    const buttons = renderer.root.findAll(
      (node: Node) =>
        node.props.accessibilityRole === 'button' &&
        typeof node.props.style === 'function',
    );
    const styleOf = (index: number) =>
      (
        buttons[index]!.props.style as (state: {
          pressed: boolean;
        }) => unknown[]
      )({ pressed: false });
    const flat = (index: number) =>
      Object.assign({}, ...(styleOf(index).flat() as object[]));
    expect(flat(buttons.length - 1).backgroundColor).toBe('#F85E00');
    act(() => renderer.unmount());
  });

  it('still accepts a flat action list', () => {
    const plugin = actionsPlugin({
      actions: [{ label: 'Reset', onPress: () => undefined }],
    });
    const renderer = render(plugin.component);
    expect(texts(renderer)).toContain('Reset');
    act(() => renderer.unmount());
  });
});

describe('environmentPlugin', () => {
  it('shows the current label, not the id, in the badge and page', () => {
    const plugin = environmentPlugin({
      list: [
        { id: '0', label: 'Development' },
        { id: '1', label: 'Stage' },
      ],
      current: () => '1',
      onSelect: () => undefined,
    });
    expect(plugin.badge?.()).toBe('Stage');

    const renderer = render(plugin.component);
    expect(texts(renderer).join(' ')).toContain('Stage');
    expect(texts(renderer)).not.toContain('1');
    act(() => renderer.unmount());
  });
});
