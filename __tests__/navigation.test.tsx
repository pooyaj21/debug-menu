import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { DebugMenu, DebugMenuProvider, useDebugMenu } from '../src';
import type { DebugPlugin } from '../src/types';

// JS fallback stack: no react-native-screens / safe-area-context.
jest.mock('../src/optional', () => ({
  getScreens: () => null,
  getSafeArea: () => null,
  useSafeInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

function Probe({
  onReady,
}: {
  onReady: (api: ReturnType<typeof useDebugMenu>) => void;
}) {
  const api = useDebugMenu();
  useEffect(() => {
    onReady(api);
  }, [api, onReady]);
  return <View />;
}

function PluginScreen() {
  const menu = useDebugMenu();
  return (
    <View>
      <Text testID="plugin-title">Plugin</Text>
      <Text testID="param">{String(menu.params.value ?? '')}</Text>
    </View>
  );
}

const plugin: DebugPlugin = {
  id: 'sample',
  title: 'Sample',
  component: PluginScreen,
};

describe('debug menu navigation', () => {
  let renderer: ReactTestRenderer | null = null;

  afterEach(() => {
    if (renderer) {
      act(() => {
        renderer!.unmount();
      });
      renderer = null;
    }
  });

  it('open/push/back/close update the stack', () => {
    let api: ReturnType<typeof useDebugMenu> | null = null;

    act(() => {
      renderer = create(
        <DebugMenuProvider enabled plugins={[plugin]}>
          <Probe
            onReady={(value) => {
              api = value;
            }}
          />
        </DebugMenuProvider>,
      );
    });

    expect(api).not.toBeNull();

    act(() => {
      DebugMenu.open();
    });

    expect(
      renderer!.root.findAll(
        (node: { props: { testID?: string } }) =>
          node.props.testID === 'plugin-title',
      ).length,
    ).toBe(0);

    act(() => {
      api!.push('sample', { value: 'hello' });
    });

    expect(
      renderer!.root.findByProps({ testID: 'plugin-title' }).props.children,
    ).toBe('Plugin');
    expect(renderer!.root.findByProps({ testID: 'param' }).props.children).toBe(
      'hello',
    );

    act(() => {
      api!.back();
    });

    expect(
      renderer!.root.findAll(
        (node: { props: { testID?: string } }) =>
          node.props.testID === 'plugin-title',
      ).length,
    ).toBe(0);

    act(() => {
      DebugMenu.open('sample', { value: 'direct' });
    });

    expect(renderer!.root.findByProps({ testID: 'param' }).props.children).toBe(
      'direct',
    );

    act(() => {
      DebugMenu.close();
    });

    expect(
      renderer!.root.findAll(
        (node: { props: { testID?: string } }) =>
          node.props.testID === 'plugin-title',
      ).length,
    ).toBe(0);
  });

  it('is a safe no-op when provider is disabled', () => {
    act(() => {
      renderer = create(
        <DebugMenuProvider enabled={false} plugins={[plugin]}>
          <Text>child</Text>
        </DebugMenuProvider>,
      );
    });

    expect(() => {
      act(() => {
        DebugMenu.open('sample');
        DebugMenu.close();
      });
    }).not.toThrow();
  });
});
