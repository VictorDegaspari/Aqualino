import React, {useCallback, useEffect, useRef, useState} from 'react';
import {launchCamera} from 'react-native-image-picker';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useIsFocused, useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {useSessionStore} from '../../auth/application/sessionStore';
import {useHydrationHome} from '../../hydration/presentation/useHydrationHome';
import {useSyncStatusStore} from '../../hydration/application/syncStatusStore';
import {HomeView} from './HomeView';
import {AppDialog} from '../../../shared/components/AppDialog';
import {useChallengeActions} from './useChallengeActions';

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const recordedAmountMl = route.params?.recordedAmountMl;
  const user = useSessionStore(state => state.user);
  const refreshUser = useSessionStore(state => state.refreshUser);
  const {query} = useHydrationHome();
  const challenges = useChallengeActions();
  const syncing = useSyncStatusStore(state => state.syncing);
  const pending = useSyncStatusStore(state => state.pending);
  const openingCamera = useRef(false);
  const [cameraError, setCameraError] = useState(false);
  const refreshHome = query.refetch;

  useEffect(() => {
    if (!isFocused) return;
    const refresh = () => {refreshHome(); refreshUser().catch(() => undefined);};
    refresh();
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [isFocused, refreshHome, refreshUser]);

  useEffect(() => {
    if (!isFocused || !recordedAmountMl) return;
    const timer = setTimeout(() => navigation.setParams({recordedAmountMl: undefined}), 3000);
    return () => clearTimeout(timer);
  }, [isFocused, navigation, recordedAmountMl]);

  const openHydration = useCallback(async () => {
    if (openingCamera.current) return;
    openingCamera.current = true;
    try {
      const result = await launchCamera({
        mediaType: 'photo', cameraType: 'back', quality: 0.8, maxWidth: 1920, maxHeight: 1920,
        saveToPhotos: false, includeBase64: false,
      });
      if (result.didCancel) return;
      const photoUri = result.assets?.[0]?.uri;
      if (result.errorCode || !photoUri) {
        setCameraError(true);
        return;
      }
      navigation.navigate('QuickHydration', {source: 'mobile', photoUri});
    } catch {
      setCameraError(true);
    } finally {
      openingCamera.current = false;
    }
  }, [navigation]);
  const openInventory = useCallback(() => navigation.navigate('Inventory'), [navigation]);

  return (
    <>
      <HomeView
        data={query.data?.data}
        loading={query.isLoading}
        refreshing={query.isFetching}
        error={query.error instanceof Error ? query.error.message : undefined}
        offline={Boolean(query.data?.offline)}
        syncing={syncing}
        pending={pending}
        recordedAmountMl={recordedAmountMl}
        displayName={user?.profile.display_name ?? 'pessoa'}
        avatarId={user?.profile.avatar_url}
        streak={user?.streak ?? 0}
        xp={user?.xp_total ?? 0}
        level={user?.level ?? 1}
        startingChallenge={challenges.starting}
        challengeError={challenges.startError}
        onStartChallenge={mode => {challenges.start(mode).catch(() => undefined);}}
        onClaimReward={challenges.claim}
        motionEnabled={isFocused && !cameraError}
        onRetry={query.refetch}
        onOpenHydration={openHydration}
        onOpenInventory={openInventory}
      />
      {cameraError ? <AppDialog
        title="Não foi possível abrir a câmera"
        message="A foto é necessária para registrar a água. Verifique a permissão da câmera e tente novamente."
        icon="waterPlus"
        onClose={() => setCameraError(false)}
      /> : null}
    </>
  );
}
