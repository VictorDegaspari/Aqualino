import {hydrationRemoteRepository} from '../data/hydrationRemoteRepository';
import {SQLiteOutboxStore} from '../data/sqliteOutboxStore';
import {widgetBridge} from '../../widget/data/widgetBridge';
import {OfflineHydrationService} from './offlineHydrationService';
import {useSessionStore} from '../../auth/application/sessionStore';
import {AppError} from '../../../shared/errors/AppError';

const legacyStore = new SQLiteOutboxStore();
const accountDatabaseName = (userId: string) => `aqualino-${userId.replace(/[^a-zA-Z0-9-]/g, '')}.sqlite`;
let recoveringLegacy = false;
const services = new Map<string, OfflineHydrationService>();

function currentService(): OfflineHydrationService {
  const userId = useSessionStore.getState().user?.id;
  if (!userId) throw new AppError('Entre novamente para registrar água.', 'AUTHENTICATION_REQUIRED', 401);
  let service = services.get(userId);
  if (!service) {
    const verifyAccount = () => {
      if (useSessionStore.getState().user?.id !== userId) throw new AppError('A conta ativa mudou. O registro continua salvo na conta original.', 'ACCOUNT_CHANGED', 403);
    };
    const guarded = async <T,>(request: () => Promise<T>): Promise<T> => {
      verifyAccount();
      const result = await request();
      verifyAccount();
      return result;
    };
    service = new OfflineHydrationService(new SQLiteOutboxStore(accountDatabaseName(userId)), {
      getHome: () => guarded(() => hydrationRemoteRepository.getHome()),
      getLogs: (date, page) => guarded(() => hydrationRemoteRepository.getLogs(date, page)),
      record: input => guarded(() => hydrationRemoteRepository.record(input)),
      updateGoal: amount => guarded(() => hydrationRemoteRepository.updateGoal(amount)),
    }, {write: async snapshot => {verifyAccount(); await widgetBridge.write(snapshot);}});
    services.set(userId, service);
  }
  return service;
}

export const hydrationService = {
  legacyPendingCount: () => legacyStore.pendingCount(),
  recoverLegacy: async (userId: string): Promise<void> => {
    if (recoveringLegacy) throw new AppError('Aguarde a recuperação atual.', 'HYDRATION_RECORD_BUSY');
    recoveringLegacy = true;
    try {
      const target = new SQLiteOutboxStore(accountDatabaseName(userId));
      for (const event of await legacyStore.pending()) {
        if (useSessionStore.getState().user?.id !== userId) throw new AppError('A conta ativa mudou. Tente novamente.', 'ACCOUNT_CHANGED', 403);
        // Enqueue is idempotent: interruption before removal is safe to retry.
        await target.enqueue(event);
        await legacyStore.remove(event.clientEventId);
      }
    } finally {recoveringLegacy = false;}
  },
  cachedOrRemote: (...args: Parameters<OfflineHydrationService['cachedOrRemote']>) => currentService().cachedOrRemote(...args),
  record: (...args: Parameters<OfflineHydrationService['record']>) => currentService().record(...args),
  logs: (...args: Parameters<OfflineHydrationService['logs']>) => currentService().logs(...args),
  flush: () => currentService().flush(),
  pendingCount: () => currentService().pendingCount(),
  rememberChallenges: (...args: Parameters<OfflineHydrationService['rememberChallenges']>) => currentService().rememberChallenges(...args),
};
