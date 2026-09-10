import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {AppState} from 'react-native';
import {LoadingMascot} from '../presentation/LoadingMascot';

jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('react-native-reanimated', () => ({useReducedMotion: () => false}));

it('plays the loading state machine from the bundled artboard', async () => {
  AppState.currentState = 'active';
  const view = await render(<LoadingMascot style={{width: 220, height: 220}} />);
  const animation = view.getByTestId('loading-mascot-animation');
  expect(animation.props.artboardName).toBe('Aqualino Loading');
  expect(animation.props.stateMachineName).toBe('Aqualino - Loading');
  expect(animation.props.autoplay).toBe(true);
});

it('shows the original loading image if Rive fails', async () => {
  const view = await render(<LoadingMascot style={{width: 220, height: 220}} />);
  await fireEvent(view.getByTestId('loading-mascot-animation'), 'error', {message: 'Load failed'});
  expect(view.getByTestId('loading-mascot-fallback').props.source).toEqual(require('../../../assets/mascot/static/loading_aqualino.webp'));
  expect(view.queryByTestId('loading-mascot-animation')).toBeNull();
});
