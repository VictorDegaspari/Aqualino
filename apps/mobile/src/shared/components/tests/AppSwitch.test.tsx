import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {AppSwitch} from '../AppSwitch';

test.each([false, true])('holds the new position while saving from %s and blocks repeated taps', async initial => {
  let finish!: (accepted: boolean) => void;
  const save = jest.fn(() => new Promise<boolean>(resolve => {finish = resolve;}));
  const view = await render(<AppSwitch value={initial} onValueChange={save} accessibilityLabel="Votação" />);
  const control = () => view.getByRole('switch', {name: 'Votação'});

  await fireEvent.press(control());
  expect(control().props.accessibilityState).toEqual({checked: !initial, busy: true, disabled: true});
  await view.rerender(<AppSwitch value={initial} onValueChange={save} disabled accessibilityLabel="Votação" />);
  expect(control().props.accessibilityState.checked).toBe(!initial);
  await fireEvent.press(control());
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith(!initial);

  await act(() => finish(true));
  expect(control().props.accessibilityState.checked).toBe(!initial);
  await view.rerender(<AppSwitch value={!initial} onValueChange={save} accessibilityLabel="Votação" />);
  expect(control().props.accessibilityState).toEqual({checked: !initial, busy: false, disabled: false});
  await view.rerender(<AppSwitch value={initial} onValueChange={save} accessibilityLabel="Votação" />);
  expect(control().props.accessibilityState.checked).toBe(initial);
});

test.each(['false', 'rejection'])('restores the confirmed value after a failed save (%s)', async result => {
  let finish!: (accepted: boolean) => void;
  let fail!: (error: Error) => void;
  const save = () => new Promise<boolean>((resolve, reject) => {finish = resolve; fail = reject;});
  const view = await render(<AppSwitch value onValueChange={save} accessibilityLabel="Lembrete" />);
  await fireEvent.press(view.getByRole('switch'));
  expect(view.getByRole('switch').props.accessibilityState.checked).toBe(false);
  await act(() => {if (result === 'false') finish(false); else fail(new Error('Failed'));});
  expect(view.getByRole('switch').props.accessibilityState).toEqual({checked: true, busy: false, disabled: false});
});

test('does not change disabled controls', async () => {
  const save = jest.fn();
  const view = await render(<AppSwitch value disabled onValueChange={save} accessibilityLabel="Lembrete" />);
  await fireEvent.press(view.getByRole('switch'));
  expect(save).not.toHaveBeenCalled();
  expect(view.getByRole('switch').props.accessibilityState.checked).toBe(true);
});
