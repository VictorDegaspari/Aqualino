import React, {useCallback, useEffect, useState} from 'react';
import {AppState} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useQueryClient} from '@tanstack/react-query';
import type {Achievement} from '@aqualino/contracts';
import {useSessionStore} from '../../auth/application/sessionStore';
import {requiresEmailVerification} from '../../auth/application/emailVerification';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {useAchievementLocalStore} from '../application/achievementLocalStore';
import {achievementKey, synchronizeAchievements} from '../application/achievementSync';
import {AchievementModal} from './AchievementModal';
import {achievementCopy} from './achievementCopy';
import {useAchievements} from './useAchievements';

export function AchievementProvider({children}: React.PropsWithChildren): React.JSX.Element {
  const user = useSessionStore(state => state.user);
  return <>{children}{user?.profile.onboarding_completed_at && !requiresEmailVerification(user) ? <AchievementSession key={user.id} userId={user.id} /> : null}</>;
}

function AchievementSession({userId}: {userId: string}): React.JSX.Element | null {
  const {items} = useAchievements();
  const queryClient = useQueryClient();
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const local = useAchievementLocalStore();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [active, setActive] = useState<Achievement | null>(null);
  const pendingReminder = local.pendingReminders[userId];
  const pendingAcknowledgements = local.pendingAcknowledgements[userId];
  const synchronize = useCallback(() => {
    synchronizeAchievements(userId, queryClient).catch(() => undefined);
  }, [queryClient, userId]);

  useEffect(() => {
    synchronize();
    const network = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        synchronize();
        queryClient.invalidateQueries({queryKey: achievementKey(userId)});
      }
    });
    const appState = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state === 'active') {
        synchronize();
        queryClient.invalidateQueries({queryKey: achievementKey(userId)});
      }
    });
    const timer = setInterval(() => {if (AppState.currentState === 'active') synchronize();}, 30_000);
    return () => {network(); appState.remove(); clearInterval(timer);};
  }, [queryClient, synchronize, userId]);

  useEffect(() => {if (pendingReminder || pendingAcknowledgements?.length) synchronize();}, [pendingAcknowledgements, pendingReminder, synchronize]);

  const next = items.find(item => item.unlocked_at && !item.celebrated_at && !local.seen[userId]?.includes(item.code));
  useEffect(() => {
    if (!foreground || active || local.detailOpen || !next) return;
    const timer = setTimeout(() => setActive(next), 450);
    return () => clearTimeout(timer);
  }, [active, foreground, local.detailOpen, next]);

  if (!foreground || !active) return null;
  return <AchievementModal achievement={active} copy={achievementCopy[locale]} locale={locale} celebration onClose={() => {
    local.dismiss(userId, active.code);
    setActive(null);
  }} />;
}
