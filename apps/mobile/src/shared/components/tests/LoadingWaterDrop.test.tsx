import React from 'react';
import {render} from '@testing-library/react-native';
import {LoadingWaterDrop} from '../LoadingWaterDrop';

test('exposes the shared water drop as a busy progress indicator', async () => {
  const view = await render(<LoadingWaterDrop testID="water-loader" size={52} accessibilityLabel="Carregando dados" />);

  expect(view.getByTestId('water-loader')).toHaveStyle({width: 52, height: 52});
  expect(view.getByRole('progressbar', {name: 'Carregando dados'}).props.accessibilityState).toEqual({busy: true});
});
