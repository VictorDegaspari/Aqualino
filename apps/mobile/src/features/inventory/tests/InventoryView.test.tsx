import type {Inventory} from '@aqualino/contracts';
import {fireEvent, render} from '@testing-library/react-native';
import React from 'react';
import {InventoryView} from '../presentation/InventoryView';

const inventory: Inventory = {
  items: [
    {code: 'streak_freeze', quantity: 3, reserved_quantity: 1, available_quantity: 2},
    {code: 'streak_revive', quantity: 1, reserved_quantity: 0, available_quantity: 1},
  ],
  usage: {
    blocked_by_group_challenge: false,
    hydration_freeze: {
      id: '01KFREEZE',
      status: 'armed',
      eligible_from: '2026-09-03',
      created_at: '2026-09-03T12:00:00Z',
    },
  },
};

const props = {
  inventory,
  loading: false,
  onRetry: jest.fn(),
  onActivateFreeze: jest.fn(),
  onReleaseFreeze: jest.fn(),
  onReviveStreak: jest.fn(),
};

test('renders loading state', async () => {
  const view = await render(<InventoryView {...props} inventory={undefined} loading />);

  expect(view.getByLabelText('Carregando inventário')).toBeTruthy();
});

test('renders error state and retries', async () => {
  const onRetry = jest.fn();
  const view = await render(
    <InventoryView {...props} inventory={undefined} loading={false} error="Sem conexão" onRetry={onRetry} />,
  );

  await fireEvent.press(view.getByRole('button', {name: 'Tentar novamente'}));
  expect(onRetry).toHaveBeenCalledTimes(1);
});

test('renders available and reserved potion balances', async () => {
  const view = await render(<InventoryView {...props} />);

  expect(view.getByLabelText('Congelamento de streak: 2 disponível')).toBeTruthy();
  expect(view.getByText('1 reservada(s) para proteção ativa')).toBeTruthy();
  expect(view.getByLabelText('Poção de reacender: 1 disponível')).toBeTruthy();
  expect(view.getByText('Proteção ativa')).toBeTruthy();
});

test('renders the potion store while real-money products are being prepared', async () => {
  const view = await render(<InventoryView {...props} />);

  expect(view.getByText('Loja de poções')).toBeTruthy();
  expect(view.getByLabelText('Congelamento de streak, indisponível')).toBeTruthy();
  expect(view.getByLabelText('Poção de reacender, indisponível')).toBeTruthy();
  expect(view.getAllByText('Em breve')).toHaveLength(2);
  expect(view.getByText('Compra segura pela App Store ou Google Play.')).toBeTruthy();
});

test('releases an armed freeze and uses a revival potion', async () => {
  const onReleaseFreeze = jest.fn();
  const onReviveStreak = jest.fn();
  const view = await render(
    <InventoryView {...props} onReleaseFreeze={onReleaseFreeze} onReviveStreak={onReviveStreak} />,
  );

  await fireEvent.press(view.getByRole('button', {name: 'Cancelar proteção'}));
  await fireEvent.press(view.getByRole('button', {name: 'Reacender streak'}));

  expect(onReleaseFreeze).toHaveBeenCalledWith('01KFREEZE');
  expect(onReviveStreak).toHaveBeenCalledTimes(1);
});

test('activates a freeze when no protection is armed', async () => {
  const onActivateFreeze = jest.fn();
  const availableInventory: Inventory = {
    ...inventory,
    items: [
      {code: 'streak_freeze', quantity: 1, reserved_quantity: 0, available_quantity: 1},
      inventory.items[1],
    ],
    usage: {blocked_by_group_challenge: false, hydration_freeze: null},
  };
  const view = await render(
    <InventoryView {...props} inventory={availableInventory} onActivateFreeze={onActivateFreeze} />,
  );

  await fireEvent.press(view.getByRole('button', {name: 'Ativar proteção'}));

  expect(onActivateFreeze).toHaveBeenCalledTimes(1);
});

test('disables potion usage and shows suspended state during a group challenge', async () => {
  const onReviveStreak = jest.fn();
  const blockedInventory: Inventory = {
    ...inventory,
    usage: {
      blocked_by_group_challenge: true,
      hydration_freeze: {...inventory.usage.hydration_freeze!, status: 'suspended'},
    },
  };
  const view = await render(
    <InventoryView {...props} inventory={blockedInventory} onReviveStreak={onReviveStreak} />,
  );

  expect(view.getByText('Poções guardadas durante a batalha')).toBeTruthy();
  expect(view.getByText('Proteção suspensa durante a batalha')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: 'Reacender streak'}));
  expect(onReviveStreak).not.toHaveBeenCalled();
});
