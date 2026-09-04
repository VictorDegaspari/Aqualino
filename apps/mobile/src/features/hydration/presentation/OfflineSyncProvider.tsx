import React, {useEffect} from 'react';
import NetInfo from '@react-native-community/netinfo';
import {useQueryClient} from '@tanstack/react-query';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {useSessionStore} from '../../auth/application/sessionStore';
import {hydrationService} from '../application/hydrationService';
import {useSyncStatusStore} from '../application/syncStatusStore';

export function OfflineSyncProvider({children}: React.PropsWithChildren): React.JSX.Element {
  const queryClient = useQueryClient();
  const sessionStatus = useSessionStore(state => state.status);
  const setSyncing = useSyncStatusStore(state => state.setSyncing);
  const setPending = useSyncStatusStore(state => state.setPending);

  useEffect(() => {
    if (sessionStatus !== 'signedIn') return;

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
          .then(async count => {
            setPending(await hydrationService.pendingCount());
            if (count > 0) {
              await queryClient.invalidateQueries({queryKey: ['hydration', 'home']});
            }
          })
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
  }, [queryClient, sessionStatus, setPending, setSyncing]);

  return <>{children}</>;
}
