import React from 'react';
import {render} from '@testing-library/react-native';
import {CurrentWaterDrop} from '../presentation/challenge/CurrentWaterDrop';

test('shows an empty drop before the first drink', async () => {
  const view = await render(<CurrentWaterDrop scale={1} totalMl={0} goalMl={2000} />);

  expect(view.getByTestId('current-water-drop')).toBeTruthy();
  expect(view.queryByTestId('current-water-drop-liquid')).toBeNull();
});

test.each([
  {totalMl: 500, goalMl: 2000, height: 31.75, y: 107.25},
  {totalMl: 1000, goalMl: 2000, height: 63.5, y: 75.5},
  {totalMl: 1500, goalMl: 3000, height: 63.5, y: 75.5},
  {totalMl: 1500, goalMl: 2000, height: 95.25, y: 43.75},
  {totalMl: 2000, goalMl: 2000, height: 127, y: 12},
  {totalMl: 3000, goalMl: 2000, height: 127, y: 12},
])('fills the drop for $totalMl of $goalMl ml without overflowing', async ({totalMl, goalMl, height, y}) => {
  const view = await render(<CurrentWaterDrop scale={1} totalMl={totalMl} goalMl={goalMl} />);
  const liquid = view.getByTestId('current-water-drop-liquid');

  // The original silhouette spans y=12 to y=139, so half a goal fills 63.5 units.
  expect(Number(liquid.props.height)).toBe(height);
  expect(Number(liquid.props.y)).toBe(y);
});

test('updates after a drink and empties when the daily total resets', async () => {
  const view = await render(<CurrentWaterDrop scale={1} totalMl={500} goalMl={2000} />);

  await view.rerender(<CurrentWaterDrop scale={1} totalMl={1000} goalMl={2000} />);
  expect(Number(view.getByTestId('current-water-drop-liquid').props.height)).toBe(63.5);

  await view.rerender(<CurrentWaterDrop scale={1} totalMl={0} goalMl={2000} />);
  expect(view.queryByTestId('current-water-drop-liquid')).toBeNull();
});

test('shows no liquid when the daily goal is unavailable', async () => {
  const view = await render(<CurrentWaterDrop scale={1} totalMl={500} goalMl={0} />);

  expect(view.queryByTestId('current-water-drop-liquid')).toBeNull();
});
