import {hydrationRemoteRepository} from '../data/hydrationRemoteRepository';
import {SQLiteOutboxStore} from '../data/sqliteOutboxStore';
import {widgetBridge} from '../../widget/data/widgetBridge';
import {OfflineHydrationService} from './offlineHydrationService';

export const hydrationService = new OfflineHydrationService(
  new SQLiteOutboxStore(),
  hydrationRemoteRepository,
  widgetBridge,
);

