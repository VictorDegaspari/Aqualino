import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {useReducedMotion} from 'react-native-reanimated';
import {emptyAchievementCollection} from '../application/achievementCatalog';
import {achievementCopy} from '../presentation/achievementCopy';
import {ProfileAchievementHighlights} from '../presentation/ProfileAchievements';
import {AchievementCollectionView} from '../presentation/AchievementsScreen';
import {AchievementModal} from '../presentation/AchievementModal';
import {AppModalProvider} from '../../../shared/components/AppModal';

jest.mock('react-native-gesture-handler', () => ({...jest.requireActual('react-native-gesture-handler'), ScrollView: jest.requireActual('react-native').ScrollView}));

jest.mock('../presentation/useAchievements', () => ({useAchievements: jest.fn()}));
jest.mock('../application/achievementLocalStore', () => ({useAchievementLocalStore: jest.fn()}));
jest.mock('../../onboarding/application/onboardingPreferencesStore', () => ({useOnboardingPreferencesStore: jest.fn()}));
jest.mock('react-native-reanimated', () => ({...jest.requireActual('react-native-reanimated'), useReducedMotion: jest.fn(() => false)}));

const copy = achievementCopy['pt-BR'];
const items = emptyAchievementCollection.items;
const wrapper = ({children}: React.PropsWithChildren) => <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 390, height: 844}, insets: {top: 0, left: 0, bottom: 0, right: 0}}}><GestureHandlerRootView><AppModalProvider>{children}</AppModalProvider></GestureHandlerRootView></SafeAreaProvider>;

test('shows exactly four profile highlights and opens the complete collection', async () => {
  const onOpen = jest.fn();
  const highlights = items.map(item => ({...item, unlocked_at: '2026-09-04T12:00:00Z'}));
  const view = await render(<ProfileAchievementHighlights items={highlights} unlockedCount={14} copy={copy} onOpen={onOpen} />);
  for (const level of [5, 10, 50, 100]) {
    expect(view.getByText(`Nível ${level}`)).toBeTruthy();
    expect(view.getByTestId(`level-medal-${level}`, {includeHiddenElements: true})).toBeTruthy();
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
  for (const item of items) expect(view.getAllByText(copy.items[item.code].title).length).toBeGreaterThan(0);
  const highlight = view.getByRole('button', {name: 'Seus destaques. Na hora certa. Conquistada'});
  expect(view.queryByRole('button', {name: 'Seus destaques. Primeira gota. Conquistada'})).toBeNull();
  await fireEvent.press(highlight);
  expect(onSelect).toHaveBeenCalledWith(collection.find(item => item.code === 'first_reminder'));
  onSelect.mockClear();
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

test('selects up to four unlocked highlights, removes selections and saves only on confirmation', async () => {
  const onSaveHighlights = jest.fn(() => true);
  const collection = items.map((item, index) => index < 6 ? {...item, unlocked_at: '2026-09-04T12:00:00Z'} : item);
  const view = await render(<AchievementCollectionView items={collection} unlockedCount={6} copy={copy} profileCodes={[]}
    onSaveHighlights={onSaveHighlights} onBack={jest.fn()} onSelect={jest.fn()} onRefresh={jest.fn()} />, {wrapper});
  await fireEvent.press(view.getByRole('button', {name: copy.editHighlights}));
  expect(view.getAllByRole('checkbox')).toHaveLength(6);
  for (const item of collection.slice(0, 4)) await fireEvent.press(view.getByRole('checkbox', {name: `${copy.items[item.code].title}. Conquistada`}));
  const fifth = view.getByRole('checkbox', {name: 'Em ritmo. Conquistada'});
  expect(fifth).toBeDisabled();
  await fireEvent.press(fifth);
  expect(view.getByText(copy.selectionCount(4))).toBeTruthy();
  expect(onSaveHighlights).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('checkbox', {name: 'Primeira gota. Conquistada'}));
  expect(fifth).toBeEnabled();
  await fireEvent.press(fifth);
  await fireEvent.press(view.getByRole('button', {name: copy.saveHighlights}));
  expect(onSaveHighlights).toHaveBeenCalledWith(['first_reminder', 'first_goal', 'team_player', 'streak_3']);
  expect(view.queryAllByRole('checkbox')).toHaveLength(0);
});

test('cancels a draft, allows an empty selection and keeps editing when saving fails', async () => {
  const onSaveHighlights = jest.fn(() => false);
  const collection = items.map(item => ({...item, unlocked_at: '2026-09-04T12:00:00Z'}));
  const view = await render(<AchievementCollectionView items={collection} unlockedCount={14} copy={copy} profileCodes={['first_drop']}
    onSaveHighlights={onSaveHighlights} onBack={jest.fn()} onSelect={jest.fn()} onRefresh={jest.fn()} />, {wrapper});
  await fireEvent.press(view.getByRole('button', {name: copy.editHighlights}));
  await fireEvent.press(view.getByRole('checkbox', {name: 'Primeira gota. Conquistada'}));
  await fireEvent.press(view.getByRole('button', {name: copy.cancelSelection}));
  expect(onSaveHighlights).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', {name: copy.editHighlights}));
  expect(view.getByRole('checkbox', {name: 'Primeira gota. Conquistada'})).toBeChecked();
  await fireEvent.press(view.getByRole('checkbox', {name: 'Primeira gota. Conquistada'}));
  await fireEvent.press(view.getByRole('button', {name: copy.saveHighlights}));
  expect(onSaveHighlights).toHaveBeenCalledWith([]);
  expect(view.getByRole('alert')).toHaveTextContent(copy.selectionError);
  expect(view.getAllByRole('checkbox')).toHaveLength(14);
});

test('shows the chosen profile highlights in selection order without filling unused slots', async () => {
  const collection = items.map(item => ({...item, unlocked_at: '2026-09-04T12:00:00Z'}));
  const view = await render(<ProfileAchievementHighlights items={collection} unlockedCount={14} copy={copy}
    selectedCodes={['team_player', 'first_drop']} onOpen={jest.fn()} />);
  expect(view.getByText('Em equipe')).toBeTruthy();
  expect(view.getByText('Primeira gota')).toBeTruthy();
  expect(view.queryByText('Nível 100')).toBeNull();
  expect(view.queryByText('Na hora certa')).toBeNull();
  await view.rerender(<ProfileAchievementHighlights items={collection} unlockedCount={14} copy={copy} selectedCodes={[]} onOpen={jest.fn()} />);
  expect(view.queryByText('Primeira gota')).toBeNull();
  expect(view.getByRole('button', {name: copy.all})).toBeTruthy();
});
