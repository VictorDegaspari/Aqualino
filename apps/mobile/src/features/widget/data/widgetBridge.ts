import type {WidgetSnapshot} from '@aqualino/contracts';
import NativeAqualinoWidget from '../../../../specs/NativeAqualinoWidget';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {appIconMoodForCondition} from '../application/widgetAppearance';

export interface WidgetSnapshotWriter {
  write(snapshot: WidgetSnapshot): Promise<void>;
}

type NativeWidgetSnapshot = WidgetSnapshot & {is_authenticated: boolean};

function sessionSnapshot(isAuthenticated: boolean): NativeWidgetSnapshot {
  return {
    schema_version: 2,
    generated_at: new Date().toISOString(),
    user_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    last_log_at: null,
    days_since_last_log: null,
    last_log_semantic_key: 'no_history',
    current_streak: 0,
    today_total_ml: 0,
    daily_goal_ml: 2_000,
    condition: isAuthenticated ? 'empty' : 'angry',
    decoration: null,
    animation: 'idle',
    static_asset: isAuthenticated ? 'aqualino_happy_active' : 'aqualino_sad',
    is_authenticated: isAuthenticated,
  };
}

function writeNativeSnapshot(snapshot: NativeWidgetSnapshot): void {
  if (NativeAqualinoWidget.getSchemaVersion() !== snapshot.schema_version) return;
  if (NativeAqualinoWidget.writeSnapshot(JSON.stringify(snapshot))) {
    NativeAqualinoWidget.requestReload();
  }
}

export function setWidgetAuthenticationState(isAuthenticated: boolean): void {
  writeNativeSnapshot(sessionSnapshot(isAuthenticated));
}

export function reloadWidget(): void {
  NativeAqualinoWidget.requestReload();
}

export const widgetBridge: WidgetSnapshotWriter = {
  async write(snapshot) {
    if (!secureTokenStore.getCached()) {
      writeNativeSnapshot(sessionSnapshot(false));
      return;
    }
    if (NativeAqualinoWidget.getSchemaVersion() !== snapshot.schema_version) {
      return;
    }
    try {
      NativeAqualinoWidget.setAppIconMood(appIconMoodForCondition(snapshot.condition));
    } catch {
      // Launcher icon support must never block widget or hydration updates.
    }
    writeNativeSnapshot({...snapshot, is_authenticated: true});
  },
};
