module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['react-native-gesture-handler/jestSetup'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^react-native-haptic-feedback$': '<rootDir>/test/mocks/reactNativeHapticFeedback.js',
    '^react-native-reanimated$': '<rootDir>/test/mocks/reactNativeReanimated.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-reanimated|react-native-worklets)/)',
  ],
};
