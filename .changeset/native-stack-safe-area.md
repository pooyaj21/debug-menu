---
'@pj21/debug-menu': minor
---

Native stack navigation and safe area. With the optional peer `react-native-screens`, pages slide in from the right and support full-screen swipe-back; the menu itself opens like a pushed screen, rendered as an overlay in the app root instead of a `Modal` (a native stack inside `Modal` loses touch input on iOS 26). Android hardware back is handled via `BackHandler`. With `react-native-safe-area-context`, the header clears the status bar / Dynamic Island. New toolbar (rounded back button, left-aligned title), home entries as filled buttons, divider-separated rows, new `action` / `onAction` color tokens and `medium` / `bold` font tokens. `withDebugMenu` now enables Metro optional dependencies when enabled.
