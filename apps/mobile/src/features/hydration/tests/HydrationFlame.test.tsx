import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {AppState, type AppStateStatus} from 'react-native';
import {HydrationFlame} from '../presentation/HydrationFlame';

const mockReducedMotion = jest.fn(() => false);
jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('react-native-reanimated', () => ({useReducedMotion: () => mockReducedMotion()}));

beforeEach(() => {
  AppState.currentState = 'active';
  mockReducedMotion.mockReturnValue(false);
});
afterEach(() => jest.restoreAllMocks());

it('lights after drinking water and goes out when the daily total resets', async () => {
  const view = await render(<HydrationFlame totalMl={0} size={22} />);
  expect(view.queryByTestId('streak-fire-animation')).toBeNull();
  await view.rerender(<HydrationFlame totalMl={250} size={22} />);
  expect(view.getByTestId('streak-fire-animation').props.stateMachineName).toBe('Streak - Queimando');
  expect(view.getByTestId('streak-fire-animation').props.autoplay).toBe(true);
  await view.rerender(<HydrationFlame totalMl={0} size={22} />);
  expect(view.queryByTestId('streak-fire-animation')).toBeNull();
});

it('pauses in the background and resumes on return', async () => {
  let listener!: (state: AppStateStatus) => void;
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, callback) => {
    listener = callback;
    return {remove};
  });
  const view = await render(<HydrationFlame totalMl={250} size={22} />);
  await act(() => listener('background'));
  expect(view.getByTestId('streak-fire-animation').props.autoplay).toBe(false);
  await act(() => listener('active'));
  expect(view.getByTestId('streak-fire-animation').props.autoplay).toBe(true);
  await view.unmount();
  expect(remove).toHaveBeenCalled();
});

it('respects reduced motion and keeps the lit fallback on a Rive error', async () => {
  mockReducedMotion.mockReturnValue(true);
  const view = await render(<HydrationFlame totalMl={250} size={22} />);
  expect(view.getByTestId('streak-fire-animation').props.autoplay).toBe(false);
  await fireEvent(view.getByTestId('streak-fire-animation'), 'error', {message: 'Load failed'});
  expect(view.queryByTestId('streak-fire-animation')).toBeNull();
  expect(view.getByLabelText('Fogo aceso: você já bebeu água hoje')).toBeTruthy();
});
