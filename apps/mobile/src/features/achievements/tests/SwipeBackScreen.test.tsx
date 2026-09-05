import React from 'react';
import {Pressable, Text} from 'react-native';
import {act, fireEvent, render} from '@testing-library/react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {createGestureController} from 'react-native-gesture-handler/jest-utils';
import {SwipeBackScreen} from '../presentation/SwipeBackScreen';

async function setup() {
  const onBack = jest.fn();
  const content = () => <GestureHandlerRootView><SwipeBackScreen onBack={onBack}>{close => <Pressable accessibilityRole="button" onPress={close}><Text>Voltar</Text></Pressable>}</SwipeBackScreen></GestureHandlerRootView>;
  const view = await render(content());
  const gesture = createGestureController('achievements-back-gesture');
  const refresh = () => view.rerender(content());
  return {view, gesture, onBack, refresh};
}

test('drags the entire page with the finger and returns when released too early', async () => {
  const {view, gesture, onBack, refresh} = await setup();
  await act(async () => {gesture.begin(); gesture.activate(); gesture.update({translationX: 50});});
  await refresh();
  expect(view.getByTestId('achievements-swipe-panel')).toHaveStyle({transform: [{translateX: 50}]});
  expect(onBack).not.toHaveBeenCalled();
  await act(async () => {gesture.end({translationX: 50, velocityX: 0});});
  await refresh();
  expect(view.getByTestId('achievements-swipe-panel')).toHaveStyle({transform: [{translateX: 0}]});
  expect(onBack).not.toHaveBeenCalled();
});

test('finishes back navigation once after a deliberate swipe', async () => {
  const {gesture, onBack} = await setup();
  await act(async () => {gesture.begin(); gesture.activate(); gesture.update({translationX: 350});});
  expect(onBack).not.toHaveBeenCalled();
  await act(async () => {gesture.end({translationX: 350, velocityX: 800});});
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('returns the page after a canceled gesture even when the distance is sufficient', async () => {
  const {view, gesture, onBack, refresh} = await setup();
  await act(async () => {gesture.begin(); gesture.activate(); gesture.update({translationX: 350}); gesture.cancel();});
  await refresh();
  expect(view.getByTestId('achievements-swipe-panel')).toHaveStyle({transform: [{translateX: 0}]});
  expect(onBack).not.toHaveBeenCalled();
});

test('provides the same back action through the visible button', async () => {
  const {view, onBack} = await setup();
  await fireEvent.press(view.getByRole('button', {name: 'Voltar'}));
  expect(onBack).toHaveBeenCalledTimes(1);
});
