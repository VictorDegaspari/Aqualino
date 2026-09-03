import React, {useState} from 'react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {OfflineSyncProvider} from '../../features/hydration/presentation/OfflineSyncProvider';

export function AppProviders({children}: React.PropsWithChildren): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {queries: {retry: 1, staleTime: 30_000}, mutations: {retry: false}},
  }));

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <OfflineSyncProvider>{children}</OfflineSyncProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

