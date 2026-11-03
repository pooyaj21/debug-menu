const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withDebugMenu } = require('@pj21/debug-menu/metro');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

const escape = (p) => p.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&');

// Watch the library source so edits hot-reload in the example.
config.watchFolders = [workspaceRoot];

// The library root has its own react / react-native (dev deps). Block them so
// the example's copies are the only ones bundled.
config.resolver.blockList = [
  new RegExp(`^${escape(path.join(workspaceRoot, 'node_modules', 'react'))}[/\\\\].*$`),
  new RegExp(`^${escape(path.join(workspaceRoot, 'node_modules', 'react-native'))}[/\\\\].*$`),
];
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules/react'),
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
};
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = withDebugMenu(config, {
  enabled: process.env.DEBUG_MENU !== 'off',
});
