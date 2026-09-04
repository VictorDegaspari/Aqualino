import React, {useState} from 'react';
import {StyleSheet} from 'react-native';
import {BottomSheetModalProvider} from '@gorhom/bottom-sheet';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {OfflineSyncProvider} from '../../features/hydration/presentation/OfflineSyncProvider';

export function AppProviders({children}: React.PropsWithChildren): React.JSX.Element {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {queries: {retry: 1, staleTime: 30_000}, mutations: {retry: false}},
  }));

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <OfflineSyncProvider>{children}</OfflineSyncProvider>
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({root: {flex: 1}});
