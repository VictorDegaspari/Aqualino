module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.riv$': '<rootDir>/test/mocks/riveAsset.js',
    '^rive-react-native$': '<rootDir>/test/mocks/rive.js',
    '^@notifee/react-native$': '<rootDir>/test/mocks/notifee.js',
    '^react-native-haptic-feedback$': '<rootDir>/test/mocks/reactNativeHapticFeedback.js',
    '^react-native-reanimated$': '<rootDir>/test/mocks/reactNativeReanimated.js',
    '^react-native-worklets$': '<rootDir>/test/mocks/reactNativeWorklets.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation/routers|react-native-gesture-handler|react-native-reanimated|react-native-worklets)/)',
  ],
};
