import type {AchievementCode, AchievementCollection} from '@aqualino/contracts';
import {createMMKV} from 'react-native-mmkv';
import {create} from 'zustand';
import {emptyAchievementCollection} from './achievementCatalog';

const storage = createMMKV({id: 'aqualino.achievements'});
const stateKey = 'local.v1';
const knownCodes = new Set(emptyAchievementCollection.items.map(item => item.code));

interface PersistedState {
  pendingReminders: Record<string, string>;
  seen: Record<string, AchievementCode[]>;
  pendingAcknowledgements: Record<string, AchievementCode[]>;
}
interface LocalState extends PersistedState {
  detailOpen: boolean;
  setDetailOpen: (open: boolean) => void;
  markReminder: (userId: string) => void;
  reminderSynced: (userId: string) => void;
  dismiss: (userId: string, code: AchievementCode) => void;
  acknowledgementSynced: (userId: string, code: AchievementCode) => void;
}

function readState(): PersistedState {
  try {
    const value = JSON.parse(storage.getString(stateKey) ?? '{}');
    const lists = (entries: unknown): Record<string, AchievementCode[]> => Object.fromEntries(
      Object.entries(entries && typeof entries === 'object' ? entries : {}).filter(([, codes]) => Array.isArray(codes))
        .map(([userId, codes]) => [userId, (codes as AchievementCode[]).filter(code => knownCodes.has(code))]),
    );
    return {
      pendingReminders: Object.fromEntries(Object.entries(value.pendingReminders ?? {}).filter((entry): entry is [string, string] => typeof entry[1] === 'string' && Number.isFinite(Date.parse(entry[1])))),
      seen: lists(value.seen), pendingAcknowledgements: lists(value.pendingAcknowledgements),
    };
  } catch {
    return {pendingReminders: {}, seen: {}, pendingAcknowledgements: {}};
  }
}

export const useAchievementLocalStore = create<LocalState>((set, get) => {
  const update = (patch: Partial<PersistedState>) => {
    const next = {...get(), ...patch};
    set(patch);
    try {
      storage.set(stateKey, JSON.stringify({pendingReminders: next.pendingReminders, seen: next.seen, pendingAcknowledgements: next.pendingAcknowledgements}));
    } catch {
      // A local storage issue must not turn a successfully scheduled reminder into a failed action.
    }
  };
  return {
    ...readState(),
    detailOpen: false,
    setDetailOpen: detailOpen => set({detailOpen}),
    markReminder(userId) {
      if (get().pendingReminders[userId] || readAchievementSnapshot(userId)?.items.some(item => item.code === 'first_reminder' && item.unlocked_at)) return;
      update({pendingReminders: {...get().pendingReminders, [userId]: new Date().toISOString()}});
    },
    reminderSynced(userId) {
      const pendingReminders = {...get().pendingReminders};
      delete pendingReminders[userId];
      update({pendingReminders});
    },
    dismiss(userId, code) {
      if (get().seen[userId]?.includes(code)) return;
      update({
        seen: {...get().seen, [userId]: [...(get().seen[userId] ?? []), code]},
        pendingAcknowledgements: {...get().pendingAcknowledgements, [userId]: [...(get().pendingAcknowledgements[userId] ?? []), code]},
      });
    },
    acknowledgementSynced(userId, code) {
      update({pendingAcknowledgements: {...get().pendingAcknowledgements, [userId]: (get().pendingAcknowledgements[userId] ?? []).filter(item => item !== code)}});
    },
  };
});

export function readAchievementSnapshot(userId: string): AchievementCollection | undefined {
  try {
    const value = JSON.parse(storage.getString(`collection.${userId}`) ?? 'null');
    if (!value || !Array.isArray(value.items) || value.items.length !== knownCodes.size) return undefined;
    if (!value.items.every((item: AchievementCollection['items'][number]) => item && knownCodes.has(item.code) && Number.isFinite(item.progress) && item.target > 0 && (item.unlocked_at === null || Number.isFinite(Date.parse(item.unlocked_at))))) return undefined;
    if (new Set(value.items.map((item: AchievementCollection['items'][number]) => item.code)).size !== knownCodes.size) return undefined;
    return value;
  } catch {
    return undefined;
  }
}

export function saveAchievementSnapshot(userId: string, collection: AchievementCollection): void {
  try { storage.set(`collection.${userId}`, JSON.stringify(collection)); } catch { /* The remote collection remains in the query cache. */ }
}
