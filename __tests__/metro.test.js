const { withDebugMenu } = require('../src/metro');

describe('withDebugMenu', () => {
  it('only enables optional dependencies when enabled', () => {
    const resolveRequest = jest.fn();
    const config = withDebugMenu(
      { resolver: { resolveRequest }, transformer: { minifierPath: 'x' } },
      { enabled: true },
    );
    expect(config.resolver.resolveRequest).toBe(resolveRequest);
    expect(config.transformer).toEqual({
      allowOptionalDependencies: true,
      minifierPath: 'x',
    });
  });

  it('keeps an explicit allowOptionalDependencies', () => {
    const config = withDebugMenu(
      { transformer: { allowOptionalDependencies: false } },
      { enabled: true },
    );
    expect(config.transformer.allowOptionalDependencies).toBe(false);
  });

  it('maps all package imports to noop when disabled', () => {
    const previous = jest.fn((context, moduleName, platform) => ({
      type: 'sourceFile',
      filePath: `previous:${moduleName}:${platform}`,
    }));

    const config = withDebugMenu(
      { resolver: { resolveRequest: previous } },
      { enabled: false },
    );

    const context = {
      resolveRequest: jest.fn((ctx, moduleName, platform) => ({
        type: 'sourceFile',
        filePath: `resolved:${moduleName}:${platform}`,
      })),
    };

    const result = config.resolver.resolveRequest(
      context,
      '@pj21/debug-menu/log',
      'ios',
    );

    expect(context.resolveRequest).toHaveBeenCalledWith(
      context,
      '@pj21/debug-menu/noop',
      'ios',
    );
    expect(result.filePath).toBe('resolved:@pj21/debug-menu/noop:ios');
    expect(previous).not.toHaveBeenCalled();
  });

  it('preserves previous resolveRequest for other modules', () => {
    const previous = jest.fn(() => ({ type: 'empty' }));
    const config = withDebugMenu(
      { resolver: { resolveRequest: previous } },
      { enabled: false },
    );

    const context = { resolveRequest: jest.fn() };
    config.resolver.resolveRequest(context, 'react-native', 'android');

    expect(previous).toHaveBeenCalledWith(context, 'react-native', 'android');
  });
});
