module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  // Metro resolves the SDK's "react-native" entry; make Jest match it.
  moduleNameMapper: {
    '^@bridge/sdk-react-native$': '<rootDir>/node_modules/@bridge/sdk-react-native/dist/index.native.js',
  },
  // These ship untranspiled ESM; let babel-jest handle them.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|@react-navigation|@bridge|react-native-screens|react-native-safe-area-context)/)',
  ],
};
