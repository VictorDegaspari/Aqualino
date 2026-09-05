/* global jest */

const {Animated, Easing} = require('react-native');
const {useRef} = require('react');

function useSharedValue(value) {
  return useRef({value}).current;
}

function useAnimatedStyle(updater) {
  return updater();
}

function useAnimatedSensor() {
  return {
    sensor: {value: {qw: 1, qx: 0, qy: 0, qz: 0, yaw: 0, pitch: 0, roll: 0, interfaceOrientation: 0}},
    unregister: jest.fn(),
    isAvailable: false,
    config: {interval: 50, adjustToInterfaceOrientation: true},
  };
}

function withTiming(value, _config, callback) {
  callback?.(true);
  return value;
}

function withDelay(_delay, animation) {
  return animation;
}

function withSequence(...animations) {
  return animations.at(-1);
}

function withRepeat(animation) {
  return animation;
}

function interpolate(_value, _inputRange, outputRange) {
  return outputRange[0];
}

module.exports = {
  __esModule: true,
  default: Animated,
  cancelAnimation: jest.fn(),
  Easing,
  interpolate,
  isSharedValue: value => Boolean(value && typeof value === 'object' && 'value' in value),
  ReduceMotion: {System: 'system'},
  SensorType: {ROTATION: 5},
  useAnimatedSensor,
  useAnimatedStyle,
  useReducedMotion: () => false,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring: withTiming,
  withTiming,
};
