import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BackHandler, Modal, Platform, StyleSheet, View } from 'react-native';
import { DebugMenu, registerDebugMenuController } from './controller';
import {
  createHomeEntry,
  resolvePluginEntry,
  resolvePushTarget,
} from './navigation/stack';
import { DebugThemeProvider } from './theme/ThemeContext';
import { HomePage } from './components/HomePage';
import { useShakeTrigger } from './triggers/useShakeTrigger';
import { getSafeArea, getScreens } from './optional';
import {
  DebugMenuContext,
  PluginsContext,
  useDebugMenu,
  useDebugPlugins,
} from './menuContext';
import type {
  DebugMenuApi,
  DebugPageParams,
  DebugPlugin,
  DebugThemeConfig,
  DebugTriggers,
  PushTarget,
  StackEntry,
} from './types';

export type DebugMenuProviderProps = {
  enabled?: boolean;
  plugins: DebugPlugin[];
  theme?: DebugThemeConfig;
  triggers?: DebugTriggers;
  children: ReactNode;
};

export { useDebugMenu, useDebugPlugins };

type Navigation = Omit<DebugMenuApi, 'params'>;

const ROOT_ID = '__debug_root__';
const STACK_ANIMATION =
  Platform.OS === 'android' ? 'ios_from_right' : 'slide_from_right';

export function DebugMenuProvider({
  enabled = false,
  plugins,
  theme,
  triggers,
  children,
}: DebugMenuProviderProps) {
  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <EnabledDebugMenuProvider
      plugins={plugins}
      theme={theme}
      triggers={triggers}
    >
      {children}
    </EnabledDebugMenuProvider>
  );
}

function EnabledDebugMenuProvider({
  plugins,
  theme,
  triggers,
  children,
}: {
  plugins: DebugPlugin[];
  theme?: DebugThemeConfig;
  triggers?: DebugTriggers;
  children: ReactNode;
}) {
  const screens = getScreens();
  const pluginsRef = useRef(plugins);
  pluginsRef.current = plugins;

  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const [stack, setStack] = useState<StackEntry[]>([]);
  // Native stack: pages are pushed only once the modal is up, so the first
  // page slides in from the right like a regular screen push.
  const pendingRef = useRef<StackEntry[] | null>(null);

  const show = useCallback(
    (entries: StackEntry[]) => {
      if (visibleRef.current) {
        setStack(entries);
        return;
      }
      visibleRef.current = true;
      if (screens) {
        pendingRef.current = entries;
        setStack([]);
      } else {
        setStack(entries);
      }
      setVisible(true);
    },
    [screens],
  );

  const hide = useCallback(() => {
    visibleRef.current = false;
    pendingRef.current = null;
    setVisible(false);
    setStack([]);
  }, []);

  const flushPending = useCallback(() => {
    if (!pendingRef.current) return false;
    const entries = pendingRef.current;
    pendingRef.current = null;
    setStack(entries);
    return true;
  }, []);

  const open = useCallback(
    (pageId?: string, params?: DebugPageParams) => {
      const home = createHomeEntry(HomePage);
      const entry = pageId
        ? resolvePluginEntry(pluginsRef.current, pageId, params)
        : null;
      show(entry ? [home, entry] : [home]);
    },
    [show],
  );

  // Native stack: popping everything animates back to the transparent root,
  // whose onAppear then hides the modal. JS fallback: hide right away.
  const close = useCallback(() => {
    if (screens && visibleRef.current) {
      pendingRef.current = null;
      setStack([]);
      return;
    }
    hide();
  }, [screens, hide]);

  const push = useCallback((target: PushTarget, params?: DebugPageParams) => {
    const entry = resolvePushTarget(pluginsRef.current, target, params);
    if (!entry) return;
    setStack((prev) => [...prev, entry]);
  }, []);

  const back = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (!screens && visible && stack.length === 0) hide();
  }, [screens, visible, stack.length, hide]);

  const onRootAppear = useCallback(() => {
    if (flushPending()) return;
    if (visibleRef.current) hide();
  }, [flushPending, hide]);

  // Native swipe-back / hardware back already popped the screen; sync state.
  const onDismissed = useCallback((key: string) => {
    setStack((prev) => {
      const index = prev.findIndex((entry) => entry.key === key);
      return index === -1 ? prev : prev.slice(0, index);
    });
  }, []);

  useEffect(() => registerDebugMenuController({ open, close }), [open, close]);

  // Overlay mode has no Modal onRequestClose, so handle Android back here.
  useEffect(() => {
    if (!screens || !visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [screens, visible, back]);

  // Safety net in case the root screen's onAppear never arrives.
  useEffect(() => {
    if (!screens || !visible || !pendingRef.current) return;
    const timer = setTimeout(flushPending, 400);
    return () => clearTimeout(timer);
  }, [screens, visible, flushPending]);

  useShakeTrigger({
    triggers,
    onShake: () => open(),
  });

  const navigation = useMemo<Navigation>(
    () => ({ push, back, close, open }),
    [push, back, close, open],
  );

  const top = stack[stack.length - 1];
  const rootApi = useMemo<DebugMenuApi>(
    () => ({ ...navigation, params: top?.params ?? {} }),
    [navigation, top],
  );

  const content = screens ? (
    <screens.ScreenStack style={styles.fill}>
      <screens.ScreenStackItem
        screenId={ROOT_ID}
        headerConfig={{ hidden: true }}
        onAppear={onRootAppear}
      >
        <View style={styles.fill} />
      </screens.ScreenStackItem>
      {stack.map((entry) => (
        <screens.ScreenStackItem
          key={entry.key}
          screenId={entry.key}
          headerConfig={{ hidden: true }}
          stackAnimation={STACK_ANIMATION}
          gestureEnabled
          fullScreenSwipeEnabled
          onDismissed={() => onDismissed(entry.key)}
        >
          <StackPage entry={entry} navigation={navigation} />
        </screens.ScreenStackItem>
      ))}
    </screens.ScreenStack>
  ) : top ? (
    <StackPage key={top.key} entry={top} navigation={navigation} />
  ) : null;

  const SafeAreaProvider = getSafeArea()?.SafeAreaProvider;
  const menu = (
    <DebugThemeProvider config={theme}>
      {SafeAreaProvider ? (
        <SafeAreaProvider style={styles.fill}>{content}</SafeAreaProvider>
      ) : (
        <View style={styles.fill}>{content}</View>
      )}
    </DebugThemeProvider>
  );

  return (
    <PluginsContext.Provider value={plugins}>
      <DebugMenuContext.Provider value={rootApi}>
        {children}
        {screens ? (
          // Not inside <Modal>: a native stack there never gets view-controller
          // appearance callbacks, which on iOS 26 leaves its touches blocked.
          visible ? (
            <View style={StyleSheet.absoluteFill}>{menu}</View>
          ) : null
        ) : (
          <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={back}
          >
            {menu}
          </Modal>
        )}
      </DebugMenuContext.Provider>
    </PluginsContext.Provider>
  );
}

/** Each page gets its own params, so pages under the top one keep theirs. */
function StackPage({
  entry,
  navigation,
}: {
  entry: StackEntry;
  navigation: Navigation;
}) {
  const api = useMemo<DebugMenuApi>(
    () => ({ ...navigation, params: entry.params }),
    [navigation, entry.params],
  );
  const Page = entry.component;
  return (
    <DebugMenuContext.Provider value={api}>
      <View style={styles.fill}>
        <Page />
      </View>
    </DebugMenuContext.Provider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

export { DebugMenu };
