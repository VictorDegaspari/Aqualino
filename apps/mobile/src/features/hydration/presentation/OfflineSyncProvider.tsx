import React, {useEffect, useState} from 'react';
import {AppState} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useQueryClient} from '@tanstack/react-query';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {useSessionStore} from '../../auth/application/sessionStore';
import {requiresEmailVerification} from '../../auth/application/emailVerification';
import {hydrationService} from '../application/hydrationService';
import {useSyncStatusStore} from '../application/syncStatusStore';
import {AppDialog} from '../../../shared/components/AppDialog';
import {useTranslation} from '../../../shared/i18n/useTranslation';

export function OfflineSyncProvider({children}: React.PropsWithChildren): React.JSX.Element {
  const {t} = useTranslation();
  const [rejectedCount, setRejectedCount] = useState(0);
  const queryClient = useQueryClient();
  const userId = useSessionStore(state => state.user?.id);
  const sessionStatus = useSessionStore(state => state.status);
  const verificationRequired = useSessionStore(state => requiresEmailVerification(state.user));
  const refreshUser = useSessionStore(state => state.refreshUser);
  const setSyncing = useSyncStatusStore(state => state.setSyncing);
  const setPending = useSyncStatusStore(state => state.setPending);

  useEffect(() => {
    if (sessionStatus !== 'signedIn' || verificationRequired) return;

    let active = true;
    let connected = false;
    let running = false;
    let syncAgain = false;
    let unsubscribe: (() => void) | undefined;
    let secondFrame: number | undefined;
    let backgroundTimer: ReturnType<typeof setTimeout> | undefined;
    const sync = async () => {
      if (!active || !connected || !secureTokenStore.getCached()) return;
      if (running) {syncAgain = true; return;}
      running = true;
      try {
        do {
          syncAgain = false;
          const queued = await hydrationService.pendingCount();
          if (!active) break;
          if (!queued) {setPending(0); break;}
          setSyncing(true);
          const {synced, rejected} = await hydrationService.flush();
          if (!active) return;
          if (rejected > 0) setRejectedCount(count => count + rejected);
          if (synced > 0) {
            refreshUser().catch(() => undefined);
            queryClient.invalidateQueries({queryKey: ['groups']});
          }
          if (synced > 0 || rejected > 0) {
            queryClient.invalidateQueries({queryKey: ['achievements']});
            await queryClient.invalidateQueries({queryKey: ['hydration']});
          }
          const count = await hydrationService.pendingCount();
          if (active) setPending(count);
        } while (syncAgain && active && connected);
      } catch {
        // Durable events remain queued for connectivity, foreground, or timed retries.
      } finally {
        running = false;
        if (active) setSyncing(false);
      }
    };
    const startBackgroundSync = () => {
      if (!active) return;

      hydrationService.pendingCount().then(count => {if (active) setPending(count);}).catch(() => undefined);
      unsubscribe = NetInfo.addEventListener(state => {
        // OS internet validation can fail while our API is reachable (including over USB).
        // Let the request determine availability; failed sends stay in the durable queue.
        connected = state.isConnected === true;
        sync();
      });
    };
    const unsubscribeQueue = useSyncStatusStore.subscribe((state, previous) => {
      if (state.pending > previous.pending) sync();
    });
    const foreground = AppState.addEventListener('change', state => {if (state === 'active') sync();});
    const retryTimer = setInterval(() => {if (AppState.currentState === 'active') sync();}, 30_000);
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => {
        backgroundTimer = setTimeout(startBackgroundSync, 500);
      });
    });

    return () => {
      active = false;
      unsubscribeQueue();
      foreground.remove();
      clearInterval(retryTimer);
      setRejectedCount(0);
      setSyncing(false);
      setPending(0);
      cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) cancelAnimationFrame(secondFrame);
      if (backgroundTimer) clearTimeout(backgroundTimer);
      unsubscribe?.();
    };
  }, [queryClient, userId, sessionStatus, verificationRequired, setPending, setSyncing, refreshUser]);

  return <>{children}{rejectedCount > 0 ? <AppDialog
    title={t('Marcações não sincronizadas', 'Logs not synced', 'Registros no sincronizados')}
    message={t(`${rejectedCount} marcação(ões) não foram aceitas e o progresso foi corrigido. O prazo de envio é de 24 horas; os limites de marcação também precisam ser respeitados.`, `${rejectedCount} log(s) were not accepted and progress was corrected. Sync within 24 hours and respect the recording limits.`, `${rejectedCount} registro(s) no fueron aceptados y se corrigió el progreso. Sincroniza dentro de 24 horas y respeta los límites de registro.`)}
    icon="water"
    onClose={() => setRejectedCount(0)}
  /> : null}</>;
}
