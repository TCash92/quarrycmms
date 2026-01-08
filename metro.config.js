// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// For web platform, stub out WatermelonDB modules
const mocksDir = path.join(__dirname, 'src/database/mocks');

// Map WatermelonDB submodules to their web stubs
const watermelonMocks = {
  '@nozbe/watermelondb': path.join(mocksDir, 'watermelondb.web.js'),
  '@nozbe/watermelondb/decorators': path.join(mocksDir, 'watermelondb-decorators.web.js'),
  '@nozbe/watermelondb/adapters/sqlite': path.join(mocksDir, 'watermelondb-adapters-sqlite.web.js'),
  '@nozbe/watermelondb/Schema/migrations': path.join(mocksDir, 'watermelondb-schema-migrations.web.js'),
  '@nozbe/watermelondb/react': path.join(mocksDir, 'watermelondb-react.web.js'),
};

// Map other native modules to web stubs
const nativeModuleMocks = {
  'expo-secure-store': path.join(mocksDir, 'expo-secure-store.web.js'),
  'expo-task-manager': path.join(mocksDir, 'expo-task-manager.web.js'),
  'expo-background-fetch': path.join(mocksDir, 'expo-background-fetch.web.js'),
};

// Resolver configuration for web platform
const originalResolver = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // On web platform, redirect WatermelonDB imports to our stubs
  if (platform === 'web' && moduleName.startsWith('@nozbe/watermelondb')) {
    const mockPath = watermelonMocks[moduleName];
    if (mockPath) {
      return {
        filePath: mockPath,
        type: 'sourceFile',
      };
    }
    // Fallback to main mock for unknown submodules
    return {
      filePath: watermelonMocks['@nozbe/watermelondb'],
      type: 'sourceFile',
    };
  }

  // On web platform, redirect native module imports to our stubs
  if (platform === 'web' && nativeModuleMocks[moduleName]) {
    return {
      filePath: nativeModuleMocks[moduleName],
      type: 'sourceFile',
    };
  }

  // Fall back to default resolution
  if (originalResolver) {
    return originalResolver(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
