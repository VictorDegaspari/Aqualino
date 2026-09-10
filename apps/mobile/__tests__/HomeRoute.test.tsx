import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {HomeRoute} from '../src/app/navigation/HomeRoute';

let mockFocused = true;
const mockHomeRender = jest.fn();
jest.mock('@react-navigation/native', () => ({useIsFocused: () => mockFocused}));
jest.mock('../src/features/home/presentation/HomeLoading', () => ({HomeLoading: () => {
  const {Text} = require('react-native');
  return <Text>Carregando Aqualino</Text>;
}}));
jest.mock('../src/features/home/presentation/HomeScreen', () => ({HomeScreen: () => {
  mockHomeRender();
  const {Text} = require('react-native');
  return <Text>Home pronta</Text>;
}}));

const frames = new Map<number, (time: number) => void>();
const idleCallbacks = new Map<number, Parameters<typeof requestIdleCallback>[0]>();
const originalRequestIdleCallback = globalThis.requestIdleCallback;
const originalCancelIdleCallback = globalThis.cancelIdleCallback;
let sequence = 0;

beforeEach(() => {
  mockFocused = true;
  mockHomeRender.mockClear();
  frames.clear();
  idleCallbacks.clear();
  sequence = 0;
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++sequence, callback);
    return sequence;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(id => {if (id != null) frames.delete(id);});
  globalThis.requestIdleCallback = jest.fn(callback => {
    idleCallbacks.set(++sequence, callback);
    return sequence;
  });
  globalThis.cancelIdleCallback = jest.fn(id => {idleCallbacks.delete(id);});
});
afterEach(() => {
  jest.restoreAllMocks();
  globalThis.requestIdleCallback = originalRequestIdleCallback;
  globalThis.cancelIdleCallback = originalCancelIdleCallback;
});

async function nextFrame() {
  const pending = [...frames.values()];
  frames.clear();
  await act(() => {pending.forEach(callback => callback(0));});
}
async function layout(view: Awaited<ReturnType<typeof render>>) {
  await fireEvent(view.getByTestId('home-route'), 'layout', {nativeEvent: {layout: {x: 0, y: 0, width: 375, height: 750}}});
}
async function runIdle() {
  const pending = [...idleCallbacks.values()];
  idleCallbacks.clear();
  await act(() => {pending.forEach(callback => callback({didTimeout: false, timeRemaining: () => 10}));});
}

test('paints the loading mascot before mounting Home in an idle callback', async () => {
  const view = await render(<HomeRoute />);
  expect(view.getByText('Carregando Aqualino')).toBeTruthy();
  expect(frames.size).toBe(0);
  await layout(view);
  await nextFrame();
  expect(mockHomeRender).not.toHaveBeenCalled();
  await nextFrame();
  expect(view.getByText('Carregando Aqualino')).toBeTruthy();
  expect(globalThis.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {timeout: 250});
  await runIdle();
  expect(view.getByText('Home pronta')).toBeTruthy();
  expect(view.queryByText('Carregando Aqualino')).toBeNull();
});

test('cancels pending frames if the user leaves before the loading screen paints', async () => {
  const view = await render(<HomeRoute />);
  await layout(view);
  await view.unmount();
  expect(frames.size).toBe(0);
  expect(idleCallbacks.size).toBe(0);
  expect(mockHomeRender).not.toHaveBeenCalled();
});

test('cancels a pending idle callback on blur and resumes when focused again', async () => {
  const view = await render(<HomeRoute />);
  await layout(view);
  await nextFrame();
  await nextFrame();
  const lateCallback = [...idleCallbacks.values()][0];
  mockFocused = false;
  await view.rerender(<HomeRoute />);
  expect(idleCallbacks.size).toBe(0);
  await act(() => lateCallback({didTimeout: true, timeRemaining: () => 0}));
  expect(mockHomeRender).not.toHaveBeenCalled();
  mockFocused = true;
  await view.rerender(<HomeRoute />);
  await nextFrame();
  await nextFrame();
  await runIdle();
  expect(view.getByText('Home pronta')).toBeTruthy();
});

test('keeps the mounted Home when returning from a screen above it', async () => {
  const view = await render(<HomeRoute />);
  await layout(view);
  await nextFrame();
  await nextFrame();
  await runIdle();
  mockFocused = false;
  await view.rerender(<HomeRoute />);
  mockFocused = true;
  await view.rerender(<HomeRoute />);
  expect(view.getByText('Home pronta')).toBeTruthy();
  expect(frames.size).toBe(0);
  expect(idleCallbacks.size).toBe(0);
});
