import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {createGestureController} from 'react-native-gesture-handler/jest-utils';
import {InventoryScreen} from '../presentation/InventoryScreen';
import {useHomePreferencesStore} from '../../home/application/homePreferencesStore';

let mockUserId = 'ana';
const mockWrite = jest.fn();
const mockNavigation = {canGoBack: jest.fn(() => true), goBack: jest.fn(), replace: jest.fn()};
jest.mock('@react-navigation/native', () => ({useNavigation: () => mockNavigation}));
jest.mock('react-native-mmkv', () => ({createMMKV: () => ({getString: () => undefined, getNumber: () => undefined, getBoolean: () => undefined, contains: () => false, set: (key: string, value: string) => mockWrite(key, value)})}));
jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: (selector: (state: unknown) => unknown) => selector({user: {id: mockUserId}})}));
jest.mock('../presentation/useInventory', () => ({useInventory: () => ({data: undefined, isLoading: false, error: new Error('Sem conexão'), refetch: jest.fn()})}));
jest.mock('../presentation/useInventoryActions', () => ({useInventoryActions: () => ({
  activateFreeze: {mutateAsync: jest.fn()}, releaseFreeze: {mutateAsync: jest.fn()}, reviveStreak: {mutateAsync: jest.fn()}, actionInProgress: false,
})}));

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigation.canGoBack.mockReturnValue(true);
  mockUserId = 'ana';
  mockWrite.mockClear();
  useHomePreferencesStore.setState({themesByUser: {ana: 'open-ocean'}});
});

const screen = () => <GestureHandlerRootView><InventoryScreen /></GestureHandlerRootView>;

test('restores and saves the account’s theme from inventory even when potions are offline', async () => {
  const view = await render(screen());
  await fireEvent.press(view.getByRole('tab', {name: 'Temas'}));
  expect(view.getByRole('radio', {name: /Oceano\./}).props.accessibilityState.checked).toBe(true);

  mockUserId = 'bia';
  await view.rerender(screen());
  await fireEvent.press(view.getByRole('tab', {name: 'Temas'}));
  expect(view.getByRole('radio', {name: /Corais\./}).props.accessibilityState.checked).toBe(true);
  await fireEvent.press(view.getByRole('radio', {name: /Oceano\./}));
  expect(useHomePreferencesStore.getState().themesByUser).toEqual({ana: 'open-ocean', bia: 'open-ocean'});
  expect(mockWrite).toHaveBeenCalledWith('themes.v1', JSON.stringify({ana: 'open-ocean', bia: 'open-ocean'}));
  await fireEvent.press(view.getByRole('radio', {name: /Corais\./}));

  mockUserId = 'ana';
  await view.rerender(screen());
  await fireEvent.press(view.getByRole('tab', {name: 'Temas'}));
  expect(view.getByRole('radio', {name: /Oceano\./}).props.accessibilityState.checked).toBe(true);
  expect(useHomePreferencesStore.getState().themesByUser.bia).toBe('coral-reef');
});

test.each(['Poções', 'Temas'])('drags the entire inventory and goes back after completing the swipe in %s', async category => {
  const view = await render(screen());
  await fireEvent.press(view.getByRole('tab', {name: category}));
  const gesture = createGestureController('inventory-back-gesture');
  await act(() => {gesture.begin(); gesture.activate(); gesture.update({translationX: 350});});
  await view.rerender(screen());
  expect(view.getByTestId('inventory-swipe-panel')).toHaveStyle({transform: [{translateX: 350}]});
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
  await act(() => gesture.end({translationX: 350, velocityX: 800}));
  expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
});

test('keeps the chosen theme and category when releasing an incomplete swipe', async () => {
  const view = await render(screen());
  await fireEvent.press(view.getByRole('tab', {name: 'Temas'}));
  await fireEvent.press(view.getByRole('radio', {name: /Corais\./}));
  const gesture = createGestureController('inventory-back-gesture');
  await act(() => {gesture.begin(); gesture.activate(); gesture.update({translationX: 50}); gesture.end({translationX: 50, velocityX: 0});});
  await view.rerender(screen());
  expect(view.getByTestId('inventory-swipe-panel')).toHaveStyle({transform: [{translateX: 0}]});
  expect(view.getByRole('tab', {name: 'Temas'}).props.accessibilityState.selected).toBe(true);
  expect(view.getByRole('radio', {name: /Corais\./}).props.accessibilityState.checked).toBe(true);
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
});

test('uses the same back action from the visible button', async () => {
  const view = await render(screen());
  await fireEvent.press(view.getByRole('button', {name: 'Voltar'}));
  expect(mockNavigation.goBack).toHaveBeenCalledTimes(1);
});

test('returns to Home when inventory was opened directly without a previous screen', async () => {
  mockNavigation.canGoBack.mockReturnValue(false);
  const view = await render(screen());
  await fireEvent.press(view.getByRole('button', {name: 'Voltar'}));
  expect(mockNavigation.replace).toHaveBeenCalledWith('Home');
  expect(mockNavigation.goBack).not.toHaveBeenCalled();
});
