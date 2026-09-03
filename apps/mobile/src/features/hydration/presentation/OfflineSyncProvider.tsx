import React, {useEffect} from 'react';
import NetInfo from '@react-native-community/netinfo';
import {useQueryClient} from '@tanstack/react-query';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {hydrationService} from '../application/hydrationService';
import {useSyncStatusStore} from '../application/syncStatusStore';

export function OfflineSyncProvider({children}: React.PropsWithChildren): React.JSX.Element {
  const queryClient = useQueryClient();
  const setSyncing = useSyncStatusStore(state => state.setSyncing);
  const setPending = useSyncStatusStore(state => state.setPending);

  useEffect(() => {
    hydrationService.pendingCount().then(setPending).catch(() => undefined);
    return NetInfo.addEventListener(state => {
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
  }, [queryClient, setPending, setSyncing]);

  return <>{children}</>;
}
