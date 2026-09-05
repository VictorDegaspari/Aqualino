import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {useReducedMotion} from 'react-native-reanimated';
import {emptyAchievementCollection} from '../application/achievementCatalog';
import {achievementCopy} from '../presentation/achievementCopy';
import {ProfileAchievementHighlights} from '../presentation/ProfileAchievements';
import {AchievementCollectionView} from '../presentation/AchievementsScreen';
import {AchievementModal} from '../presentation/AchievementModal';
import {AppModalProvider} from '../../../shared/components/AppModal';

jest.mock('../presentation/useAchievements', () => ({useAchievements: jest.fn()}));
jest.mock('../application/achievementLocalStore', () => ({useAchievementLocalStore: jest.fn()}));
jest.mock('../../onboarding/application/onboardingPreferencesStore', () => ({useOnboardingPreferencesStore: jest.fn()}));
jest.mock('react-native-reanimated', () => ({...jest.requireActual('react-native-reanimated'), useReducedMotion: jest.fn(() => false)}));

const copy = achievementCopy['pt-BR'];
const items = emptyAchievementCollection.items;
const wrapper = ({children}: React.PropsWithChildren) => <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 390, height: 844}, insets: {top: 0, left: 0, bottom: 0, right: 0}}}><AppModalProvider>{children}</AppModalProvider></SafeAreaProvider>;

test('shows exactly four profile highlights and opens the complete collection', async () => {
  const onOpen = jest.fn();
  const highlights = items.map(item => ({...item, unlocked_at: '2026-09-04T12:00:00Z'}));
  const view = await render(<ProfileAchievementHighlights items={highlights} unlockedCount={14} copy={copy} onOpen={onOpen} />);
  for (const level of [5, 10, 50, 100]) {
    expect(view.getByText(`Nível ${level}`)).toBeTruthy();
    expect(view.getByTestId(`level-medal-${level}`)).toBeTruthy();
  }
  expect(view.queryByText('Primeira gota')).toBeNull();
  expect(view.getByText('14 de 14 conquistas')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: copy.all}));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

test('fills empty profile highlights with four attainable achievements', async () => {
  const view = await render(<ProfileAchievementHighlights items={items} unlockedCount={0} copy={copy} onOpen={jest.fn()} />);
  for (const code of ['first_drop', 'first_reminder', 'first_goal', 'team_player'] as const) expect(view.getByText(copy.items[code].title)).toBeTruthy();
  expect(view.queryByText('Em ritmo')).toBeNull();
});

test('shows the complete collection, filters earned and locked items and opens details', async () => {
  const onSelect = jest.fn();
  const onBack = jest.fn();
  const collection = items.map(item => item.code === 'first_reminder' ? {...item, unlocked_at: '2026-09-04T12:00:00Z', progress: 1} : item);
  const view = await render(<AchievementCollectionView items={collection} unlockedCount={1} copy={copy} onBack={onBack} onSelect={onSelect} onRefresh={jest.fn()} />, {wrapper});
  for (const item of items) expect(view.getByText(copy.items[item.code].title)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: copy.earned}));
  expect(view.getByText('Na hora certa')).toBeTruthy();
  expect(view.queryByText('Primeira gota')).toBeNull();
  await fireEvent.press(view.getByRole('button', {name: 'Na hora certa. Conquistada'}));
  expect(onSelect).toHaveBeenCalledWith(collection.find(item => item.code === 'first_reminder'));
  await fireEvent.press(view.getByRole('button', {name: copy.lockedFilter}));
  expect(view.queryByText('Na hora certa')).toBeNull();
  expect(view.getByText('Primeira gota')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', {name: copy.back}));
  expect(onBack).toHaveBeenCalledTimes(1);
});

test('keeps the collection available on refresh failure and offers retry', async () => {
  const onRefresh = jest.fn();
  const view = await render(<AchievementCollectionView items={items} unlockedCount={0} copy={copy} error onBack={jest.fn()} onSelect={jest.fn()} onRefresh={onRefresh} />, {wrapper});
  expect(view.getByText('Guardião das gotas')).toBeTruthy();
  expect(view.getByRole('alert')).toHaveTextContent(copy.error);
  await fireEvent.press(view.getByRole('button', {name: copy.retry}));
  expect(onRefresh).toHaveBeenCalledTimes(1);
});

test('shows the requirements and progress of a locked achievement', async () => {
  const achievement = {...items.find(item => item.code === 'streak_7')!, progress: 3};
  const view = await render(<AchievementModal achievement={achievement} copy={copy} locale="pt-BR" onClose={jest.fn()} />, {wrapper});
  expect(view.getByText('Alcance uma sequência de 7 dias de hidratação.')).toBeTruthy();
  expect(view.getByRole('progressbar')).toHaveAccessibilityValue({min: 0, max: 7, now: 3});
});

test('supports reduced motion and immediate dismissal without a forced celebration timer', async () => {
  jest.mocked(useReducedMotion).mockReturnValueOnce(true);
  const onClose = jest.fn();
  const view = await render(<AchievementModal achievement={{...items[0], unlocked_at: '2026-09-04T12:00:00Z'}} celebration copy={copy} locale="pt-BR" onClose={onClose} />, {wrapper});
  await fireEvent.press(view.getByRole('button', {name: 'Continuar'}));
  expect(onClose).toHaveBeenCalledTimes(1);
});
