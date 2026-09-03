import React from 'react';
import {AppProviders} from './src/app/providers/AppProviders';
import {AppNavigation} from './src/app/navigation/AppNavigation';

export default function App(): React.JSX.Element {
  return (
    <AppProviders>
      <AppNavigation />
    </AppProviders>
  );
}
