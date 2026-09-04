import React from 'react';
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
  const {query} = useHydrationHome();
  const {syncing, pending} = useSyncStatusStore();

  return (
    <HomeView
      data={query.data?.data}
      loading={query.isLoading}
      refreshing={query.isFetching}
      error={query.error instanceof Error ? query.error.message : undefined}
      offline={Boolean(query.data?.offline)}
      syncing={syncing}
      pending={pending}
      displayName={user?.profile.display_name ?? 'pessoa'}
      streak={user?.streak ?? 0}
      xp={user?.xp_total ?? 0}
      onRetry={query.refetch}
      onOpenHydration={() => navigation.navigate('QuickHydration', {source: 'mobile'})}
      onOpenInventory={() => navigation.navigate('Inventory')}
      onSignOut={signOut}
    />
  );
}
