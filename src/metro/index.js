const PACKAGE_NAME = '@pj21/debug-menu';

function isDebugMenuImport(moduleName) {
  return (
    moduleName === PACKAGE_NAME || moduleName.startsWith(PACKAGE_NAME + '/')
  );
}

/**
 * When `enabled` is false, every `@pj21/debug-menu` / `@pj21/debug-menu/*`
 * import resolves to the noop entry so production bundles stay inert.
 * Preserves any existing `resolver.resolveRequest`.
 *
 * When enabled, turns on `transformer.allowOptionalDependencies` (Expo already
 * does) so the optional peers `react-native-screens` and
 * `react-native-safe-area-context` may be missing in bare RN apps.
 */
function withDebugMenu(metroConfig, options) {
  if (!options || options.enabled) {
    return Object.assign({}, metroConfig, {
      transformer: Object.assign(
        { allowOptionalDependencies: true },
        metroConfig.transformer,
      ),
    });
  }

  const previous = metroConfig.resolver && metroConfig.resolver.resolveRequest;

  const resolveRequest = (context, moduleName, platform) => {
    if (isDebugMenuImport(moduleName)) {
      return context.resolveRequest(context, PACKAGE_NAME + '/noop', platform);
    }

    if (previous) {
      return previous(context, moduleName, platform);
    }

    return context.resolveRequest(context, moduleName, platform);
  };

  return Object.assign({}, metroConfig, {
    resolver: Object.assign({}, metroConfig.resolver, { resolveRequest }),
  });
}

module.exports = {
  withDebugMenu,
};
