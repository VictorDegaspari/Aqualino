import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {HydrationReview} from '@aqualino/contracts';
import {HydrationReviewCard} from '../presentation/HydrationReviewCard';

jest.mock('../../../shared/security/secureTokenStore', () => ({secureTokenStore: {getCached: () => 'test-token'}}));
jest.mock('../../../shared/device/haptics', () => ({haptics: {lightImpact: jest.fn(), success: jest.fn()}}));

const review: HydrationReview = {
  id: 'log', user_id: 'author', display_name: 'Ana', avatar_url: 'avatar_2', amount_ml: 300,
  occurred_at: '2026-09-07T12:00:00Z', photo_path: '/hydration/logs/log/photo',
  expires_at: '2026-09-08T00:00:00Z', invalidated_at: null, status: 'pending',
  eligible_voters: 4, invalid_votes_required: 3, valid_votes: 0, invalid_votes: 2,
  abstentions: 2, your_vote: null, can_vote: true,
};

async function setup(value = review, onVote = jest.fn().mockResolvedValue(undefined)) {
  const onDismiss = jest.fn();
  const view = await render(<SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, right: 0, bottom: 0, left: 0}}}>
    <HydrationReviewCard review={value} locale="pt-BR" onVote={onVote} onDismiss={onDismiss} />
  </SafeAreaProvider>);
  return {view, onVote, onDismiss};
}

test('shows the submitted photo and uses the left decision for an invalid volume', async () => {
  const {view, onVote} = await setup();
  const photo = view.getByTestId('hydration-review-photo');
  expect(photo.props.source.headers).toEqual({Authorization: 'Bearer test-token'});
  expect(view.getByText('300 ml')).toBeTruthy();
  expect(view.getByRole('button', {name: 'Marcar como inválida'})).toBeDisabled();

  await fireEvent(photo, 'load');
  await fireEvent.press(view.getByRole('button', {name: 'Marcar como inválida'}));

  await waitFor(() => expect(onVote).toHaveBeenCalledWith('invalid'));
  await waitFor(() => expect(view.getByRole('button', {name: 'Marcar como inválida'})).toBeEnabled());
});

test('uses the right decision for a valid volume and blocks duplicate votes', async () => {
  let finish!: () => void;
  const onVote = jest.fn(() => new Promise<void>(resolve => {finish = resolve;}));
  const {view} = await setup(review, onVote);
  await fireEvent(view.getByTestId('hydration-review-photo'), 'load');

  await fireEvent.press(view.getByRole('button', {name: 'Marcar como válida'}));
  await fireEvent.press(view.getByRole('button', {name: 'Marcar como inválida'}));

  expect(onVote).toHaveBeenCalledTimes(1);
  expect(onVote).toHaveBeenCalledWith('valid');
  await act(async () => finish());
});

test('returns the card to the deck when the photo or vote cannot be loaded', async () => {
  const {view, onVote} = await setup(review, jest.fn().mockRejectedValue(new Error('Sem conexão.')));
  await fireEvent(view.getByTestId('hydration-review-photo'), 'error');
  expect(view.getByRole('button', {name: 'Marcar como válida'})).toBeDisabled();
  await fireEvent.press(view.getByRole('button', {name: 'Recarregar foto'}));
  await fireEvent(view.getByTestId('hydration-review-photo'), 'load');
  await fireEvent.press(view.getByRole('button', {name: 'Marcar como válida'}));

  await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Sem conexão.'));
  expect(onVote).toHaveBeenCalledWith('valid');
  expect(view.getByRole('button', {name: 'Marcar como válida'})).toBeEnabled();
});
