import React from 'react';
import {Alert} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {useSessionStore} from '../../auth/application/sessionStore';
import {useHydrationHome} from '../../hydration/presentation/useHydrationHome';
import {useSyncStatusStore} from '../../hydration/application/syncStatusStore';
import {HomeView} from './HomeView';

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useSessionStore(state => state.user);
  const signOut = useSessionStore(state => state.signOut);
  const {query, record, isRecording} = useHydrationHome();
  const {syncing, pending} = useSyncStatusStore();

  const hydrate = async (amount: number) => {
    try {
      await record({amountMl: amount, source: 'mobile'});
    } catch (error) {
      Alert.alert('Não foi possível registrar', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  return (
    <HomeView
      data={query.data?.data}
      loading={query.isLoading || isRecording}
      refreshing={query.isFetching}
      error={query.error instanceof Error ? query.error.message : undefined}
      offline={Boolean(query.data?.offline)}
      syncing={syncing}
      pending={pending}
      volumes={user?.profile.favorite_volumes_ml ?? [200, 300, 500]}
      displayName={user?.profile.display_name ?? 'pessoa'}
      streak={user?.streak ?? 0}
      level={user?.level ?? 1}
      onHydrate={hydrate}
      onRetry={query.refetch}
      onOpenInventory={() => navigation.navigate('Inventory')}
      onSignOut={signOut}
    />
  );
}
