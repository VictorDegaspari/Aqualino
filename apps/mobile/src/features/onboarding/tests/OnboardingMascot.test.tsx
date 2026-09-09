import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {AppState, type AppStateStatus} from 'react-native';
import {OnboardingMascot} from '../presentation/OnboardingMascot';

const mockIsFocused = jest.fn(() => true);
const mockReducedMotion = jest.fn(() => false);
jest.mock('@react-navigation/native', () => ({useIsFocused: () => mockIsFocused()}));
jest.mock('react-native-reanimated', () => ({useReducedMotion: () => mockReducedMotion()}));

const {mockPlay, mockPause} = require('rive-react-native');

describe('OnboardingMascot', () => {
  let onAppStateChange: (state: AppStateStatus) => void;
  const removeSubscription = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused.mockReturnValue(true);
    mockReducedMotion.mockReturnValue(false);
    AppState.currentState = 'active';
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      onAppStateChange = listener;
      return {remove: removeSubscription};
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it('loads the bundled professor artboard and plays its greeting', async () => {
    const view = await render(<OnboardingMascot style={{width: 146, height: 132}} accessibilityLabel="Aqualino" />);
    const animation = view.getByTestId('onboarding-mascot-animation');
    expect(animation.props.source).toBe(1);
    expect(animation.props.artboardName).toBe('Aqualino Professor - Tchau e Piscada');
    expect(animation.props.stateMachineName).toBe('Aqualino - Saudacao');
    expect(animation.props.autoplay).toBe(true);
    expect(view.getByRole('image', {name: 'Aqualino'})).toBeTruthy();
    expect(mockPlay).toHaveBeenCalledWith('Aqualino - Saudacao', 'auto', 'auto', true);
  });

  it('pauses in the background, resumes, and removes the subscription on unmount', async () => {
    const view = await render(<OnboardingMascot style={{width: 146, height: 132}} />);
    await act(() => onAppStateChange('background'));
    expect(view.getByTestId('onboarding-mascot-animation').props.autoplay).toBe(false);
    expect(mockPause).toHaveBeenCalled();
    mockPlay.mockClear();
    await act(() => onAppStateChange('active'));
    expect(mockPlay).toHaveBeenCalledTimes(1);
    await view.unmount();
    expect(removeSubscription).toHaveBeenCalledTimes(1);
  });

  it('pauses when the screen loses focus', async () => {
    const view = await render(<OnboardingMascot style={{width: 100, height: 100}} />);
    mockIsFocused.mockReturnValue(false);
    await view.rerender(<OnboardingMascot style={{width: 100, height: 100}} />);
    expect(view.getByTestId('onboarding-mascot-animation').props.autoplay).toBe(false);
    expect(mockPause).toHaveBeenCalled();
  });

  it('keeps the mascot still with reduced motion enabled', async () => {
    mockReducedMotion.mockReturnValue(true);
    const view = await render(<OnboardingMascot style={{width: 100, height: 100}} />);
    expect(view.getByTestId('onboarding-mascot-animation').props.autoplay).toBe(false);
    expect(mockPlay).not.toHaveBeenCalled();
  });

  it('keeps a visible mascot if the native renderer cannot load the file', async () => {
    const view = await render(<OnboardingMascot style={{width: 100, height: 100}} />);
    await fireEvent(view.getByTestId('onboarding-mascot-animation'), 'error', {message: 'Failed to load'});
    expect(view.getByTestId('onboarding-mascot-fallback')).toBeTruthy();
    expect(view.queryByTestId('onboarding-mascot-animation')).toBeNull();
  });
});
