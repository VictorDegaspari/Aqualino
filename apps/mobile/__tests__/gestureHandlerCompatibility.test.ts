describe('React Native Gesture Handler compatibility', () => {
  it('does not access the deprecated DrawerLayoutAndroid export at startup', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    jest.isolateModules(() => {
      require('react-native-gesture-handler');
    });

    expect(warn.mock.calls.flat().join(' ')).not.toContain(
      'DrawerLayoutAndroid is deprecated',
    );
    warn.mockRestore();
  });
});
