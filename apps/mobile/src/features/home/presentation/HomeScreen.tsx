import React, {useCallback} from 'react';
import {Alert} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useNavigation} from '@react-navigation/native';
import {launchCamera} from 'react-native-image-picker';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {useSessionStore} from '../../auth/application/sessionStore';
import {useHydrationHome} from '../../hydration/presentation/useHydrationHome';
import {useSyncStatusStore} from '../../hydration/application/syncStatusStore';
import {HomeView} from './HomeView';

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useSessionStore(state => state.user);
  const {query} = useHydrationHome();
  const syncing = useSyncStatusStore(state => state.syncing);
  const pending = useSyncStatusStore(state => state.pending);

  const openHydrationCamera = useCallback(async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
        saveToPhotos: false,
        includeBase64: false,
      });

      if (result.didCancel) return;

      const photoUri = result.assets?.[0]?.uri;
      if (result.errorCode || !photoUri) {
        Alert.alert('Não foi possível abrir a câmera', result.errorMessage ?? 'Verifique se a câmera está disponível no seu dispositivo.');
        return;
      }

      navigation.navigate('QuickHydration', {source: 'mobile', photoUri});
    } catch {
      Alert.alert('Não foi possível abrir a câmera', 'Verifique se a câmera está disponível no seu dispositivo.');
    }
  }, [navigation]);
  const openInventory = useCallback(() => navigation.navigate('Inventory'), [navigation]);

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
      avatarId={user?.profile.avatar_url}
      streak={user?.streak ?? 0}
      xp={user?.xp_total ?? 0}
      hasActiveGroup={false}
      onRetry={query.refetch}
      onOpenHydration={openHydrationCamera}
      onOpenInventory={openInventory}
    />
  );
}
