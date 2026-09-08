import React from 'react';
import {act, fireEvent, render, waitFor} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import type {HydrationReview} from '@aqualino/contracts';
import {AppModalProvider} from '../../../shared/components/AppModal';
import {HydrationReviewDialog} from '../presentation/HydrationReviews';

jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
jest.mock('../../../shared/api/apiClient', () => ({apiRequest: jest.fn()}));
jest.mock('../../../shared/security/secureTokenStore', () => ({secureTokenStore: {getCached: () => 'test-token'}}));
jest.mock('../../auth/application/sessionStore', () => ({useSessionStore: jest.fn()}));

const review: HydrationReview = {
  id: 'log', user_id: 'author', display_name: 'Ana', avatar_url: null, amount_ml: 300,
  occurred_at: '2026-09-07T12:00:00Z', photo_path: '/hydration/logs/log/photo',
  expires_at: '2026-09-08T00:00:00Z', invalidated_at: null, status: 'pending',
  eligible_voters: 4, invalid_votes_required: 3, valid_votes: 0, invalid_votes: 2,
  abstentions: 2, your_vote: null, can_vote: true,
};
async function setup(value = review, onVote = jest.fn().mockResolvedValue(undefined)) {
  const view = await render(<SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, right: 0, bottom: 0, left: 0}}}>
    <AppModalProvider><HydrationReviewDialog review={value} onVote={onVote} onClose={jest.fn()} /></AppModalProvider>
  </SafeAreaProvider>);
  return {view, onVote};
}

test('requires the private photo to load before allowing a vote and prevents repeated taps', async () => {
  let finish!: () => void;
  const onVote = jest.fn(() => new Promise<void>(resolve => {finish = resolve;}));
  const {view} = await setup(review, onVote);
  expect(view.getByRole('button', {name: 'O volume não é condizente'})).toBeDisabled();
  const photo = view.getByTestId('hydration-review-photo');
  expect(photo.props.source.headers).toEqual({Authorization: 'Bearer test-token'});
  await fireEvent(photo, 'load');
  await fireEvent.press(view.getByRole('button', {name: 'O volume não é condizente'}));
  await fireEvent.press(view.getByRole('button', {name: 'O volume é condizente'}));
  expect(onVote).toHaveBeenCalledTimes(1);
  expect(onVote).toHaveBeenCalledWith('invalid');
  expect(view.getByRole('button', {name: 'Fechar revisão'})).toBeDisabled();
  await act(() => finish());
});

test('hides voting for the author, a previous voter or a closed review', async () => {
  const {view, onVote} = await setup({...review, can_vote: false});
  expect(view.queryByRole('button', {name: 'O volume é condizente'})).toBeNull();
  expect(onVote).not.toHaveBeenCalled();
  expect(view.getByText(/3 votos inválidos entre 4 pessoas/)).toBeTruthy();
});

test('keeps the review open with a retry after a failed vote or photo', async () => {
  const {view, onVote} = await setup(review, jest.fn().mockRejectedValue(new Error('Sem conexão.')));
  await fireEvent(view.getByTestId('hydration-review-photo'), 'error');
  expect(view.getByRole('button', {name: 'O volume é condizente'})).toBeDisabled();
  await fireEvent.press(view.getByRole('button', {name: 'Recarregar foto'}));
  await fireEvent(view.getByTestId('hydration-review-photo'), 'load');
  await fireEvent.press(view.getByRole('button', {name: 'O volume é condizente'}));
  await waitFor(() => expect(view.getByRole('alert')).toHaveTextContent('Sem conexão.'));
  expect(onVote).toHaveBeenCalledWith('valid');
  expect(view.getByRole('button', {name: 'O volume é condizente'})).toBeEnabled();
});
