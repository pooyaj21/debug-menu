# @pj21/debug-menu

## 1.1.2

### Patch Changes

- The menu is laid out left-to-right by default, also inside RTL apps. New `direction` prop on `DebugMenuProvider`: `'ltr'` (default), `'rtl'` or `'inherit'`.
- Fixed the back arrow coming out reversed in RTL: React Native swapped its `left` offsets but not its stroke rotations. The icon is now pinned to LTR internally and mirrored as a whole when the menu is RTL.

## 1.1.1

### Patch Changes

- `useTapTrigger({ count, windowMs, onTrigger })` returns an `onPress` for rows that take a callback instead of children; `TapTrigger` now uses it.
- `getNetworkRequests<T>()` from `/network` reads the logged requests (`[]` in the noop entry), so apps no longer import `react-native-network-logger` directly and production bundles stay free of it.

## 1.1.0

### Minor Changes

- `actionsPlugin` accepts `sections: [{ title, note, actions }]` (instead of a flat `actions` list) and a page-level `note`.
- Actions and `Button` take a `color` for the background, so buttons are no longer limited to default / destructive red.

### Patch Changes

- Network page runs edge to edge: `Page` takes `padded={false}`, and the network logger no longer sits inside the 20pt content padding.
- `environmentPlugin` shows the selected item's label (not its id) in the home badge and the "Current" line, so numeric ids no longer appear as "Environment (1)".

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
