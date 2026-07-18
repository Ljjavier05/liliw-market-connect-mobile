const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Needed so react-native-heroicons subpaths (outline/*, solid/*) resolve.
// That package has no "exports" map; packageExports mode blocks them otherwise.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
