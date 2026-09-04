import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {trigger} from 'react-native-haptic-feedback';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {ChallengeBottomNavigation} from '../presentation/challenge/ChallengeBottomNavigation';
import {ChallengeModeToggle} from '../presentation/challenge/ChallengeModeToggle';

const triggerMock = jest.mocked(trigger);
const safeAreaMetrics = {
  frame: {x: 0, y: 0, width: 375, height: 812},
  insets: {top: 44, right: 0, bottom: 34, left: 0},
};

beforeEach(() => {
  triggerMock.mockClear();
});

test('gives subtle feedback only when the challenge mode changes', async () => {
  const onChange = jest.fn();
  const view = await render(<ChallengeModeToggle mode="group" onChange={onChange} />);

  fireEvent.press(view.getByRole('tab', {name: 'Solo'}));
  fireEvent.press(view.getByRole('tab', {name: 'Grupo'}));

  expect(triggerMock).toHaveBeenCalledTimes(1);
  expect(triggerMock).toHaveBeenCalledWith(
    'selection',
    expect.objectContaining({enableVibrateFallback: false}),
  );
  expect(onChange).toHaveBeenCalledWith('solo');
});

test('gives a quick impact when navigating to another bottom tab', async () => {
  const onOpenProfile = jest.fn();
  const view = await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <ChallengeBottomNavigation activeTab="home" onOpenHistory={jest.fn()} onOpenProfile={onOpenProfile} />
    </SafeAreaProvider>,
  );

  fireEvent.press(view.getByRole('button', {name: 'Perfil'}));

  expect(triggerMock).toHaveBeenCalledTimes(1);
  expect(triggerMock).toHaveBeenCalledWith(
    'impactLight',
    expect.objectContaining({enableVibrateFallback: false}),
  );
  expect(onOpenProfile).toHaveBeenCalledTimes(1);
});

test('opens the groups tab from the bottom navigation', async () => {
  const onOpenGroup = jest.fn();
  const view = await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <ChallengeBottomNavigation activeTab="home" onOpenGroup={onOpenGroup} />
    </SafeAreaProvider>,
  );

  fireEvent.press(view.getByRole('button', {name: 'Grupo'}));

  expect(onOpenGroup).toHaveBeenCalledTimes(1);
  expect(triggerMock).toHaveBeenCalledTimes(1);
});

test('opens the reminders tab from the bottom navigation', async () => {
  const onOpenReminders = jest.fn();
  const view = await render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      <ChallengeBottomNavigation activeTab="home" onOpenReminders={onOpenReminders} />
    </SafeAreaProvider>,
  );

  fireEvent.press(view.getByRole('button', {name: 'Lembretes'}));

  expect(onOpenReminders).toHaveBeenCalledTimes(1);
  expect(triggerMock).toHaveBeenCalledTimes(1);
});
