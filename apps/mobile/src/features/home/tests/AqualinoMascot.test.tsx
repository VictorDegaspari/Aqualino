import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {AppState} from 'react-native';
import {AqualinoMascot} from '../presentation/AqualinoMascot';

jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('react-native-reanimated', () => ({useReducedMotion: () => false}));

describe('AqualinoMascot', () => {
  beforeEach(() => { AppState.currentState = 'active'; });

  it('shows Strong for boiling and replaces it when the condition changes', async () => {
    const view = await render(<AqualinoMascot condition="boiling" compact />);
    const animation = view.getByTestId('strong-mascot-animation');
    expect(animation.props.artboardName).toBe('Aqualino Strong - Forca');
    expect(animation.props.stateMachineName).toBe('Aqualino - Strong');
    expect(animation.props.autoplay).toBe(true);
    await view.rerender(<AqualinoMascot condition="happy" compact />);
    expect(view.queryByTestId('strong-mascot-animation')).toBeNull();
    expect(view.getByTestId('happy-mascot-animation')).toBeTruthy();
  });

  it('keeps the strong image if Strong fails to load', async () => {
    const view = await render(<AqualinoMascot condition="boiling" />);
    await fireEvent(view.getByTestId('strong-mascot-animation'), 'error', {message: 'Cannot load Rive'});
    expect(view.getByTestId('strong-mascot-fallback').props.source).toEqual({uri: 'aqualino_strong'});
  });

  it.each(['angry', 'skeleton'] as const)('animates the sad face for %s', async condition => {
    const view = await render(<AqualinoMascot condition={condition} compact />);
    const animation = view.getByTestId('crying-mascot-animation');
    expect(animation.props.artboardName).toBe('Aqualino Chorando - Rosto');
    expect(animation.props.stateMachineName).toBe('Aqualino - Choro');
    expect(animation.props.autoplay).toBe(true);
  });

  it('removes the crying animation after the condition improves', async () => {
    const view = await render(<AqualinoMascot condition="angry" />);
    await view.rerender(<AqualinoMascot condition="happy" />);
    expect(view.queryByTestId('crying-mascot-animation')).toBeNull();
    expect(view.getByTestId('happy-mascot-animation')).toBeTruthy();
  });

  it.each(['empty', 'happy'] as const)('animates the happy face for %s', async condition => {
    const view = await render(<AqualinoMascot condition={condition} compact />);
    const animation = view.getByTestId('happy-mascot-animation');
    expect(animation.props.artboardName).toBe('Aqualino Feliz - Rosto');
    expect(animation.props.stateMachineName).toBe('Aqualino - Feliz');
    expect(animation.props.autoplay).toBe(true);
  });

  it('keeps a happy image if the happy animation fails to load', async () => {
    const view = await render(<AqualinoMascot condition="happy" />);
    await fireEvent(view.getByTestId('happy-mascot-animation'), 'error', {message: 'Cannot load Rive'});
    expect(view.getByTestId('happy-mascot-fallback').props.source).toEqual({uri: 'aqualino_happy_active'});
  });

  it('keeps a sad image if the animation fails to load', async () => {
    const view = await render(<AqualinoMascot condition="angry" />);
    await fireEvent(view.getByTestId('crying-mascot-animation'), 'error', {message: 'Cannot load Rive'});
    expect(view.getByTestId('crying-mascot-fallback').props.source).toEqual({uri: 'aqualino_sad'});
  });
});
