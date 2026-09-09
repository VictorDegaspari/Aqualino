/* global jest */
const React = require('react');
const {View} = require('react-native');

const play = jest.fn();
const pause = jest.fn();
const Rive = React.forwardRef(function MockRive(props, ref) {
  React.useImperativeHandle(ref, () => ({play, pause}), []);
  return React.createElement(View, props);
});

module.exports = {
  __esModule: true,
  default: Rive,
  Fit: {Contain: 'contain'},
  Direction: {Auto: 'auto'},
  LoopMode: {Auto: 'auto'},
  mockPlay: play,
  mockPause: pause,
};
