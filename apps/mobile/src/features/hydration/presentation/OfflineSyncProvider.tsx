import React, {useEffect} from 'react';
import NetInfo from '@react-native-community/netinfo';
import {useQueryClient} from '@tanstack/react-query';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {useSessionStore} from '../../auth/application/sessionStore';
import {requiresEmailVerification} from '../../auth/application/emailVerification';
import {hydrationService} from '../application/hydrationService';
import {useSyncStatusStore} from '../application/syncStatusStore';

export function OfflineSyncProvider({children}: React.PropsWithChildren): React.JSX.Element {
  const queryClient = useQueryClient();
  const sessionStatus = useSessionStore(state => state.status);
  const verificationRequired = useSessionStore(state => requiresEmailVerification(state.user));
  const refreshUser = useSessionStore(state => state.refreshUser);
  const setSyncing = useSyncStatusStore(state => state.setSyncing);
  const setPending = useSyncStatusStore(state => state.setPending);

  useEffect(() => {
    if (sessionStatus !== 'signedIn' || verificationRequired) return;

    let active = true;
    let unsubscribe: (() => void) | undefined;
    let secondFrame: number | undefined;
    let backgroundTimer: ReturnType<typeof setTimeout> | undefined;
    const startBackgroundSync = () => {
      if (!active) return;

      hydrationService.pendingCount().then(setPending).catch(() => undefined);
      unsubscribe = NetInfo.addEventListener(state => {
        if (!state.isConnected || !secureTokenStore.getCached()) {
          return;
        }
        setSyncing(true);
        hydrationService.flush()
          .then(async ({synced, rejected}) => {
            if (synced > 0) {
              refreshUser().catch(() => undefined);
              queryClient.invalidateQueries({queryKey: ['groups']});
            }
            if (synced > 0 || rejected > 0) {
              queryClient.invalidateQueries({queryKey: ['achievements']});
              await queryClient.invalidateQueries({queryKey: ['hydration']});
            }
            setPending(await hydrationService.pendingCount());
          })
          .catch(() => undefined)
          .finally(() => setSyncing(false));
      });
    };
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        backgroundTimer = setTimeout(startBackgroundSync, 500);
      });
    });

    return () => {
      active = false;
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
      if (backgroundTimer) clearTimeout(backgroundTimer);
      unsubscribe?.();
    };
  }, [queryClient, sessionStatus, verificationRequired, setPending, setSyncing, refreshUser]);

  return <>{children}</>;
}
