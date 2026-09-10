import type {HydrationWeekDay} from '@aqualino/contracts';
import React from 'react';
import {fireEvent, render} from '@testing-library/react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {DayDetailsModal} from '../presentation/challenge/DayDetailsModal';

const day: HydrationWeekDay = {
  date: '2026-09-10', weekday: 4, state: 'in_progress', total_ml: 800, goal_ml: 2000,
  percentage: 40, is_today: true, is_trophy: false, protection: null,
};

const wrapper = ({children}: React.PropsWithChildren) => (
  <SafeAreaProvider initialMetrics={{frame: {x: 0, y: 0, width: 375, height: 812}, insets: {top: 0, right: 0, bottom: 0, left: 0}}}>
    {children}
  </SafeAreaProvider>
);

test('closes the day details through its controlled exit animation', async () => {
  const onClose = jest.fn();
  const view = await render(<DayDetailsModal day={day} index={2} onClose={onClose} />, {wrapper});

  fireEvent.press(view.getByRole('button', {name: 'Fechar'}));

  expect(onClose).toHaveBeenCalledTimes(1);
});
