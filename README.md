# @pj21/debug-menu

In-app **debug menu** for **Expo / React Native**. Pure JavaScript — no native code — with pluggable pages, shake/tap triggers, and a Metro helper that stubs the package out of production bundles.

- Own page stack, no react-navigation dependency. With `react-native-screens` installed it is a native stack: pages slide in from the right and swipe back from anywhere; without it, a plain JS stack
- Safe-area aware via `react-native-safe-area-context` (approximate fallback insets without it)
- Built-in plugins: log, analytics events, network, environment, feature flags, info, actions
- Optional peers only: `react-native-screens`, `react-native-safe-area-context`, `expo-sensors`, `react-native-network-logger`
- Production exclusion via `withDebugMenu` → noop entry

## Installation

```sh
npm install @pj21/debug-menu
```

Optional (any expo-router / react-navigation app already has the first two):

```sh
npx expo install react-native-screens react-native-safe-area-context
npx expo install expo-sensors
npm install react-native-network-logger
```

|              | Minimum |
| ------------ | ------- |
| React        | 18+     |
| React Native | 0.74+   |

## Quick start

```tsx
import { DebugMenuProvider, DebugMenu, TapTrigger } from '@pj21/debug-menu';
import { eventsLog } from '@pj21/debug-menu/events';
import { networkPlugin, startNetworkLogging } from '@pj21/debug-menu/network';
import { environmentPlugin } from '@pj21/debug-menu/environment';
import { featureFlagsPlugin } from '@pj21/debug-menu/feature-flags';
import { infoPlugin } from '@pj21/debug-menu/info';
import { actionsPlugin } from '@pj21/debug-menu/actions';

if (__DEV__) {
  startNetworkLogging({ maxRequests: 50 });
}

const plugins = [
  eventsLog.plugin,
  networkPlugin(),
  environmentPlugin({
    list: [
      { id: 'prod', label: 'Production' },
      { id: 'stage', label: 'Staging' },
    ],
    current: () => currentEnv,
    onSelect: (id) => setEnv(id),
  }),
  featureFlagsPlugin({
    flags: [{ key: 'newCheckout' }],
    get: (key) => overrides[key],
    set: (key, value) => setOverride(key, value),
    clear: () => clearOverrides(),
  }),
  infoPlugin({
    items: () => ({
      version: '1.0.0',
      env: currentEnv,
    }),
  }),
  actionsPlugin({
    actions: [
      { label: 'Reset onboarding', onPress: resetOnboarding, confirm: true },
    ],
  }),
  // Or grouped, with any button color:
  actionsPlugin({
    id: 'playground',
    title: 'Playground',
    sections: [
      {
        title: 'Toasts',
        note: 'Shown above the menu',
        actions: [
          { label: 'Warning', color: '#F85E00', onPress: showWarning },
          { label: 'Error', destructive: true, onPress: showError },
        ],
      },
    ],
  }),
];

export function App() {
  return (
    <DebugMenuProvider
      enabled={__DEV__}
      plugins={plugins}
      triggers={{ shake: true }}
    >
      <TapTrigger count={5} windowMs={600}>
        {/* e.g. settings version row */}
      </TapTrigger>
    </DebugMenuProvider>
  );
}

// Imperative
DebugMenu.open();
DebugMenu.open('events');
DebugMenu.close();
```

Record analytics into the built-in events log:

```ts
import { eventsLog } from '@pj21/debug-menu/events';

eventsLog.log({
  name: 'purchase_success',
  params: { total: 12 },
  channels: ['mixpanel', 'ga4'],
});
```

## Plugins

| Subpath          | Export                                                                           | Purpose                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `/log`           | `createDebugLog`                                                                 | Generic ring-buffer log + list/detail UI                                                                |
| `/events`        | `eventsLog`                                                                      | Preset log for `{ name, params?, channels? }`                                                           |
| `/network`       | `networkPlugin`, `startNetworkLogging`, `clearNetworkLogs`, `getNetworkRequests` | Wraps `react-native-network-logger`; import these instead of the package so production stays free of it |
| `/environment`   | `environmentPlugin`                                                              | Select env via adapter callbacks                                                                        |
| `/feature-flags` | `featureFlagsPlugin`                                                             | Auto / On / Off overrides                                                                               |
| `/info`          | `infoPlugin`                                                                     | Key/value dump + share all                                                                              |
| `/actions`       | `actionsPlugin`                                                                  | Buttons (any color) in sections, optional confirm                                                       |

Plugins receive app data only through the adapter options — the provider can sit above app contexts.

## Custom plugin

```tsx
import type { DebugPlugin } from '@pj21/debug-menu';
import { Page, Button, useDebugMenu } from '@pj21/debug-menu';

const customPlugin: DebugPlugin = {
  id: 'custom',
  title: 'Custom',
  section: 'Playgrounds',
  order: 100,
  component: function CustomPage() {
    const menu = useDebugMenu();
    return (
      <Page title="Custom">
        <Button label="Close" onPress={menu.close} />
      </Page>
    );
  },
};
```

Chrome primitives: `Page`, `Header`, `ListItem` / `Row`, `Button`, `Section`, `Text`.

## Theme

Optional. Built-in light/dark with `mode: 'light' | 'dark' | 'system'` (default `system`). Partial token overrides are deep-merged:

```tsx
<DebugMenuProvider
  enabled
  plugins={plugins}
  theme={{
    mode: 'system',
    colors: { primary: '#2563eb', action: '#000000', onAction: '#ffffff' },
    fonts: { regular: 'MyFont-Regular', medium: 'MyFont-Medium', bold: 'MyFont-Bold', mono: 'Menlo' },
  }}
>
```

## Direction

The menu is left-to-right by default, even in an RTL app. Pass `direction="rtl"` to mirror it, or `direction="inherit"` to follow the app.

## Triggers

- **Shake** — `triggers={{ shake: true }}` uses `@pj21/debug-menu/shake` (lazy `expo-sensors`). Or pass `{ subscribe }` for a custom source. Core never statically imports `expo-sensors`.
- **Tap** — `<DebugMenu.TapTrigger count={5} windowMs={600}>` (also exported as `TapTrigger`).
  For a row that takes a callback: `onPress: useTapTrigger({ count: 5 })`.

## Production exclusion via Metro

`withDebugMenu` also sets `transformer.allowOptionalDependencies: true` when enabled (Expo already does), so bare RN apps build without the optional peers.

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withDebugMenu } = require('@pj21/debug-menu/metro');

const config = getDefaultConfig(__dirname);

module.exports = withDebugMenu(config, {
  enabled: process.env.NODE_ENV !== 'production',
});
```

When `enabled` is `false`, every `@pj21/debug-menu` and `@pj21/debug-menu/*` import resolves to the noop entry (existing `resolveRequest` is preserved).

## Noop

`@pj21/debug-menu/noop` exports the same surface as inert stubs: provider renders children, plugin factories return dummies, logs no-op, `TapTrigger` renders children. Types match the real package.

## License

MIT © Pooya Jalali
