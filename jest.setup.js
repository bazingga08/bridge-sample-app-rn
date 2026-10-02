/* global jest */
// Native modules have no implementation under Jest: use their official mock /
// a minimal stand-in. Network is stubbed so tests never hit the live engine.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-play-install-referrer', () => ({
  PlayInstallReferrer: { getInstallReferrerInfo: (cb) => cb(null, new Error('no referrer in tests')) },
}));
global.fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ matched: false }) }));
