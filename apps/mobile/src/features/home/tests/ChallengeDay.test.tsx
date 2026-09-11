import React from 'react';
import {render} from '@testing-library/react-native';
import type {HydrationWeekDay} from '@aqualino/contracts';
import {ChallengeDay} from '../presentation/challenge/ChallengeDay';

const day: HydrationWeekDay = {
  date: '2026-09-09', weekday: 3, state: 'missed', total_ml: 500, goal_ml: 2000,
  percentage: 25, is_today: false, is_trophy: false, protection: null,
};

test.each([
  {totalMl: 500, goalMl: 2000, height: 31.75},
  {totalMl: 1500, goalMl: 3000, height: 63.5},
  {totalMl: 2500, goalMl: 2000, height: 127},
])('keeps the recorded level for a past day with $totalMl ml', async ({totalMl, goalMl, height}) => {
  const view = await render(<ChallengeDay day={{...day, total_ml: totalMl, goal_ml: goalMl, state: totalMl >= goalMl ? 'goal_achieved' : 'missed'}} index={0} scale={1} onPress={jest.fn()} />);
  expect(Number(view.getByTestId('day-water-drop-2026-09-09-liquid').props.height)).toBe(height);
  expect(view.queryByTestId('challenge-asset-dayMissed')).toBeNull();
});

test('shows the exclamation only for a past day without water', async () => {
  const view = await render(<ChallengeDay day={{...day, total_ml: 0, percentage: 0}} index={0} scale={1} onPress={jest.fn()} />);
  expect(view.getByTestId('challenge-asset-dayMissed')).toBeTruthy();
  expect(view.queryByTestId('day-water-drop-2026-09-09')).toBeNull();
});

test('preserves the same water level when today becomes a past day', async () => {
  const onPress = jest.fn();
  const view = await render(<ChallengeDay day={{...day, is_today: true, state: 'in_progress'}} index={0} scale={1} onPress={onPress} />);
  const height = Number(view.getByTestId('current-water-drop-liquid').props.height);
  await view.rerender(<ChallengeDay day={day} index={0} scale={1} onPress={onPress} />);
  expect(Number(view.getByTestId('day-water-drop-2026-09-09-liquid').props.height)).toBe(height);
  expect(view.queryByTestId('challenge-asset-dayMissed')).toBeNull();
});

test('keeps freeze protection visible alongside recorded water', async () => {
  const view = await render(<ChallengeDay day={{...day, protection: 'streak_freeze'}} index={0} scale={1} onPress={jest.fn()} />);
  expect(view.getByTestId('challenge-asset-dayFrozen')).toBeTruthy();
  expect(view.getByTestId('day-water-drop-2026-09-09-liquid')).toBeTruthy();
  expect(view.queryByTestId('challenge-asset-dayMissed')).toBeNull();
});
