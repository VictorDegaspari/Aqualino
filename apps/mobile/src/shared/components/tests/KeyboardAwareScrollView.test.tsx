import React from 'react';
import {act, fireEvent, render} from '@testing-library/react-native';
import {Keyboard, TextInput} from 'react-native';
import {KeyboardAwareScrollView} from '../KeyboardAwareScrollView';

const mockScrollTo = jest.fn();
const mockMeasureViewport = jest.fn(callback => callback(0, 20, 360, 400));
jest.mock('react-native', () => {
  const native = jest.requireActual('react-native');
  const ReactModule = require('react');
  return Object.defineProperty(Object.create(native), 'ScrollView', {
    value: ReactModule.forwardRef((props: object, ref: React.Ref<unknown>) => {
      ReactModule.useImperativeHandle(ref, () => ({scrollTo: mockScrollTo, measureInWindow: mockMeasureViewport}));
      return ReactModule.createElement(native.View, props);
    }),
  });
});

let listeners: Record<string, () => void>;
const mockInput = {measureInWindow: jest.fn(callback => callback(0, 390, 300, 54))};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  listeners = {};
  jest.spyOn(Keyboard, 'addListener').mockImplementation((event, listener) => {
    listeners[event] = () => {listener({duration: 0, easing: 'keyboard', endCoordinates: {screenX: 0, screenY: 420, width: 360, height: 300}});};
    return {remove: () => {delete listeners[event];}};
  });
  jest.spyOn(Keyboard, 'isVisible').mockReturnValue(true);
  jest.spyOn(Keyboard, 'metrics').mockReturnValue({screenX: 0, screenY: 420, width: 360, height: 300});
  jest.spyOn(TextInput.State, 'currentlyFocusedInput').mockReturnValue(mockInput as unknown as ReturnType<typeof TextInput.State.currentlyFocusedInput>);
});

afterEach(() => {jest.restoreAllMocks(); jest.useRealTimers();});

test('scrolls an obscured password above the keyboard with spacing', async () => {
  await render(<KeyboardAwareScrollView><TextInput secureTextEntry /></KeyboardAwareScrollView>);
  await act(() => {listeners.keyboardDidShow(); jest.runOnlyPendingTimers();});
  expect(mockScrollTo).toHaveBeenCalledWith({y: 48, animated: true});
});

test('keeps the current scroll position when revealing another focused field', async () => {
  const view = await render(<KeyboardAwareScrollView testID="form"><TextInput secureTextEntry /></KeyboardAwareScrollView>);
  await fireEvent.scroll(view.getByTestId('form'), {nativeEvent: {contentOffset: {y: 120}}});
  await fireEvent(view.getByTestId('form'), 'focus', {});
  await act(() => {jest.runOnlyPendingTimers();});
  expect(mockScrollTo).toHaveBeenCalledWith({y: 168, animated: true});
});

test('does not move a field that is already visible', async () => {
  mockInput.measureInWindow.mockImplementationOnce(callback => callback(0, 200, 300, 54));
  await render(<KeyboardAwareScrollView />);
  await act(() => {listeners.keyboardDidShow(); jest.runOnlyPendingTimers();});
  expect(mockScrollTo).not.toHaveBeenCalled();
});

test('does not scroll with the keyboard closed and removes its listeners on unmount', async () => {
  jest.mocked(Keyboard.isVisible).mockReturnValue(false);
  const view = await render(<KeyboardAwareScrollView />);
  await act(() => {listeners.keyboardDidShow(); jest.runOnlyPendingTimers();});
  expect(mockScrollTo).not.toHaveBeenCalled();
  await view.unmount();
  expect(listeners).toEqual({});
});
