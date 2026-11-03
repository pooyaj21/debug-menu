# @pj21/debug-menu

## 1.0.0

### Major Changes

- First stable release.
- `DebugMenuProvider` shell with plugins (`{ id, title, section, icon, order, badge, component }`), `useDebugMenu()` (`push`, `back`, `close`, `open`, `params`) and `DebugMenu.open()` / `DebugMenu.close()`.
- Built-in plugins: generic logs (`createDebugLog`), analytics events, network (via `react-native-network-logger`), environment, feature flags, info, actions.
- Navigation: with the optional peer `react-native-screens`, a native stack rendered as an overlay in the app root — pages slide in from the right, full-screen swipe-back, Android hardware back via `BackHandler`. Without it, a JS stack in a full-screen `Modal`.
- Safe-area aware pages via the optional peer `react-native-safe-area-context` (approximate fallback insets without it).
- Toolbar with rounded back button and left-aligned title; home entries as filled buttons grouped by section; divider-separated rows.
- Optional theme: light / dark / system, partial color overrides (including `action` / `onAction`), font tokens (`regular`, `medium`, `bold`, `mono`).
- Triggers: shake (`expo-sensors`, optional) and `DebugMenu.TapTrigger`.
- Production exclusion: `withDebugMenu(metroConfig, { enabled })` from `/metro` maps every import to the inert `/noop` entry; when enabled it turns on Metro optional dependencies.
