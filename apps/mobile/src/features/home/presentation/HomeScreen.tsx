import React, {useCallback, useEffect, useRef, useState} from 'react';
import {AppState} from 'react-native';
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
import {useHomePreferencesStore} from '../application/homePreferencesStore';
import {LegacyHydrationRecovery} from '../../hydration/presentation/LegacyHydrationRecovery';
import {defaultHomeThemeId} from '../domain/homeThemes';

export function HomeScreen(): React.JSX.Element {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const isFocused = useIsFocused();
  const route = useRoute<RouteProp<RootStackParamList, 'Home'>>();
  const recordedAmountMl = route.params?.recordedAmountMl;
  const user = useSessionStore(state => state.user);
  const homeThemeId = useHomePreferencesStore(state => user ? state.themesByUser[user.id] ?? defaultHomeThemeId : defaultHomeThemeId);
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
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => {clearInterval(timer); subscription.remove();};
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
        mediaType: 'photo', cameraType: 'back', quality: 0.6, maxWidth: 1280, maxHeight: 1280,
        saveToPhotos: false, includeBase64: true,
      });
      if (result.didCancel) return;
      const photoUri = result.assets?.[0]?.uri;
      const photoBase64 = result.assets?.[0]?.base64;
      if (result.errorCode || !photoUri || !photoBase64 || photoBase64.length > 1800000) {
        setCameraError(true);
        return;
      }
      navigation.navigate('QuickHydration', {source: 'mobile', photoUri, photoBase64});
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
        key={user?.id ?? 'guest'}
        homeThemeId={homeThemeId}
        data={query.data?.data}
        loading={query.isLoading}
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
        onRefresh={() => query.refetch({throwOnError: true})}
        onOpenHydration={openHydration}
        onOpenInventory={openInventory}
      />
      {user ? <LegacyHydrationRecovery key={`legacy-${user.id}`} userId={user.id} displayName={user.profile.display_name} enabled={isFocused && !cameraError} /> : null}
      {cameraError ? <AppDialog
        title="Não foi possível abrir a câmera"
        message="A foto é necessária para registrar a água. Verifique a permissão da câmera e tente novamente."
        icon="waterPlus"
        onClose={() => setCameraError(false)}
      /> : null}
    </>
  );
}
