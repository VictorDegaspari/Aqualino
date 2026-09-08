import React from 'react';
import {Pressable, Text} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {createGestureController} from 'react-native-gesture-handler/jest-utils';
import {HomeRefreshScrollView} from '../presentation/HomeRefreshScrollView';

async function setup(onRefresh = jest.fn<Promise<unknown> | void, []>()) {
  const onPress = jest.fn();
  const view = await render(<HomeRefreshScrollView onRefresh={onRefresh}>
    <Pressable accessibilityRole="button" onPress={onPress}><Text>Ver dia</Text></Pressable>
  </HomeRefreshScrollView>, {wrapper: GestureHandlerRootView});
  const gesture = createGestureController('home-refresh-gesture');
  const pull = async (distance: number) => {
    await act(() => {gesture.begin(); gesture.activate(); gesture.update({translationY: distance});});
  };
  return {view, gesture, onRefresh, onPress, pull};
}

test('returns a short pull without refreshing and preserves taps on the content', async () => {
  const {view, gesture, onRefresh, onPress, pull} = await setup();
  expect(view.queryByTestId('home-refresh-indicator')).toBeNull();
  await pull(70);
  expect(view.getByLabelText('Puxe para atualizar')).toBeTruthy();
  // The instruction is only for accessibility; the visible loader is water alone.
  expect(view.queryByText('Puxe para atualizar')).toBeNull();
  await act(() => gesture.end({translationY: 70}));
  expect(onRefresh).not.toHaveBeenCalled();
  expect(view.queryByTestId('home-refresh-indicator')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Ver dia'}));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test('refreshes only on release and holds the water until the request settles without duplicating it', async () => {
  let finish!: () => void;
  const onRefresh = jest.fn(() => new Promise<void>(resolve => {finish = resolve;}));
  const {view, gesture, pull} = await setup(onRefresh);
  await pull(160);
  expect(view.getByLabelText('Solte para atualizar')).toBeTruthy();
  expect(onRefresh).not.toHaveBeenCalled();
  await act(() => gesture.end({translationY: 160}));
  expect(view.getByRole('progressbar', {name: 'Atualizando hidratação'})).toBeTruthy();
  expect(view.queryByText('Atualizando hidratação')).toBeNull();

  await pull(160);
  await act(() => gesture.end({translationY: 160}));
  expect(onRefresh).toHaveBeenCalledTimes(1);
  expect(view.getByRole('progressbar')).toBeTruthy();
  await act(() => finish());
  expect(view.queryByTestId('home-refresh-indicator')).toBeNull();
});

test('does not refresh when a long pull is canceled', async () => {
  const {view, gesture, onRefresh, pull} = await setup();
  await pull(180);
  await act(() => gesture.cancel());
  expect(onRefresh).not.toHaveBeenCalled();
  expect(view.queryByTestId('home-refresh-indicator')).toBeNull();
});

test('allows pulling to refresh only after scrolling back to the top', async () => {
  const {view, gesture, onRefresh, pull} = await setup();
  await fireEvent.scroll(view.getByTestId('home-refresh-scroll'), {nativeEvent: {contentOffset: {x: 0, y: 200}}});
  await pull(180);
  await act(() => gesture.end({translationY: 180}));
  expect(onRefresh).not.toHaveBeenCalled();
  expect(view.queryByTestId('home-refresh-indicator')).toBeNull();

  await fireEvent.scroll(view.getByTestId('home-refresh-scroll'), {nativeEvent: {contentOffset: {x: 0, y: 0}}});
  await pull(180);
  await act(() => gesture.end({translationY: 180}));
  expect(onRefresh).toHaveBeenCalledTimes(1);
});

test('clears a failed request and lets the user retry', async () => {
  jest.useFakeTimers();
  try {
    const onRefresh = jest.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValue(undefined);
    const {view, gesture, pull} = await setup(onRefresh);
    await pull(160);
    await act(() => gesture.end({translationY: 160}));
    expect(view.getByRole('alert')).toBeTruthy();
    expect(view.queryByRole('progressbar')).toBeNull();
    await act(() => jest.advanceTimersByTime(2200));
    expect(view.queryByTestId('home-refresh-indicator')).toBeNull();
    await pull(160);
    await act(() => gesture.end({translationY: 160}));
    expect(onRefresh).toHaveBeenCalledTimes(2);
    expect(view.queryByTestId('home-refresh-indicator')).toBeNull();
  } finally {
    jest.useRealTimers();
  }
});
