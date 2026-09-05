import React, {useState} from 'react';
import {BackHandler, Pressable, Text} from 'react-native';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppDialog} from '../AppDialog';
import {AppModal, AppModalProvider} from '../AppModal';

const wrapper = ({children}: React.PropsWithChildren) => <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, left: 0, bottom: 0, right: 0}}}><AppModalProvider>{children}</AppModalProvider></SafeAreaProvider>;

function Confirmation({onConfirm}: {onConfirm: () => Promise<void | boolean>}) {
  const [open, setOpen] = useState(false);
  return <>
    <Pressable accessibilityRole="button" onPress={() => setOpen(true)}><Text>Abrir confirmação</Text></Pressable>
    {open ? <AppDialog title="Remover lembrete?" message="Você pode manter este lembrete." confirmLabel="Remover" cancelLabel="Manter" destructive onConfirm={onConfirm} onClose={() => setOpen(false)} /> : null}
  </>;
}

afterEach(() => jest.restoreAllMocks());

test('hides the underlying screen from accessibility and cancels without running the action', async () => {
  const onConfirm = jest.fn();
  const view = await render(<Confirmation onConfirm={onConfirm} />, {wrapper});
  await fireEvent.press(view.getByRole('button', {name: 'Abrir confirmação'}));
  expect(view.queryByRole('button', {name: 'Abrir confirmação'})).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Manter'}));
  expect(onConfirm).not.toHaveBeenCalled();
  expect(view.getByRole('button', {name: 'Abrir confirmação'})).toBeTruthy();
});

test('blocks repeated confirmation, backdrop and hardware Back until the action finishes', async () => {
  let back!: () => boolean | null | undefined;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {back = () => handler({type: 'hardwareBackPress', timeStamp: Date.now()}); return {remove: jest.fn()};});
  let finish!: () => void;
  const onConfirm = jest.fn(() => new Promise<void>(resolve => {finish = resolve;}));
  const view = await render(<Confirmation onConfirm={onConfirm} />, {wrapper});
  await fireEvent.press(view.getByRole('button', {name: 'Abrir confirmação'}));
  await fireEvent.press(view.getByRole('button', {name: 'Remover'}));
  expect(view.getByRole('button', {name: 'Remover'})).toBeDisabled();
  expect(view.getByRole('button', {name: 'Manter'})).toBeDisabled();
  await fireEvent.press(view.getByRole('button', {name: 'Remover'}));
  await fireEvent.press(view.getByTestId('dismiss-app-dialog', {includeHiddenElements: true}));
  await act(() => {expect(back()).toBe(true);});
  expect(view.getByRole('header', {name: 'Remover lembrete?'})).toBeTruthy();
  expect(onConfirm).toHaveBeenCalledTimes(1);
  await act(() => finish());
  await waitFor(() => expect(view.queryByRole('header', {name: 'Remover lembrete?'})).toBeNull());
});

test('keeps a failed action open with feedback and allows retry', async () => {
  const onConfirm = jest.fn().mockRejectedValueOnce(new Error('Sem conexão')).mockResolvedValueOnce(true);
  const view = await render(<Confirmation onConfirm={onConfirm} />, {wrapper});
  await fireEvent.press(view.getByRole('button', {name: 'Abrir confirmação'}));
  await fireEvent.press(view.getByRole('button', {name: 'Remover'}));
  await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Sem conexão'));
  await fireEvent.press(view.getByRole('button', {name: 'Remover'}));
  await waitFor(() => expect(view.queryByRole('header', {name: 'Remover lembrete?'})).toBeNull());
  expect(onConfirm).toHaveBeenCalledTimes(2);
});

test('hardware Back closes only the top modal and removes overlays when their owner unmounts', async () => {
  let back!: () => boolean | null | undefined;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {back = () => handler({type: 'hardwareBackPress', timeStamp: Date.now()}); return {remove: jest.fn()};});
  const closeFirst = jest.fn();
  function Stacked() {
    const [second, setSecond] = useState(true);
    return <>
      <AppModal onRequestClose={closeFirst}><Text>Primeira janela</Text></AppModal>
      {second ? <AppModal onRequestClose={() => setSecond(false)}><Text>Segunda janela</Text></AppModal> : null}
    </>;
  }
  const view = await render(<Stacked />, {wrapper});
  expect(view.queryByText('Primeira janela')).toBeNull();
  expect(view.getByText('Segunda janela')).toBeTruthy();
  await act(() => {back();});
  expect(view.getByText('Primeira janela')).toBeTruthy();
  expect(view.queryByText('Segunda janela')).toBeNull();
  expect(closeFirst).not.toHaveBeenCalled();
  await view.rerender(<Text>Tela seguinte</Text>);
  expect(view.queryByText('Primeira janela')).toBeNull();
  expect(view.getByText('Tela seguinte')).toBeTruthy();
});
