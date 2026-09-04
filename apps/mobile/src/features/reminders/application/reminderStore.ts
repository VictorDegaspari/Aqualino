import {createMMKV} from 'react-native-mmkv';
import {create} from 'zustand';
import {cancelReminder, scheduleReminder} from './reminderNotificationService';
import {
  ALL_REMINDER_WEEKDAYS,
  normalizeReminderWeekdays,
  type ReminderWeekday,
} from './reminderWeekdays';

const storage = createMMKV({id: 'aqualino.reminders'});
const remindersKey = 'hydration.dailyReminders';
const maximumReminders = 8;

export interface HydrationReminder {
  id: string;
  hour: number;
  minute: number;
  weekdays: ReminderWeekday[];
  enabled: boolean;
}

interface ReminderState {
  reminders: HydrationReminder[];
  addReminder: (hour: number, minute: number, weekdays: readonly ReminderWeekday[]) => Promise<void>;
  toggleReminder: (id: string, enabled: boolean) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  reminders: loadReminders(),
  async addReminder(hour, minute, selectedWeekdays) {
    const reminders = get().reminders;
    const weekdays = normalizeReminderWeekdays(selectedWeekdays);
    if (weekdays.length === 0) {
      throw new Error('Selecione pelo menos um dia da semana.');
    }
    if (reminders.length >= maximumReminders) {
      throw new Error(`Você pode criar até ${maximumReminders} lembretes.`);
    }
    if (reminders.some(reminder => reminder.hour === hour && reminder.minute === minute)) {
      throw new Error('Já existe um lembrete nesse horário.');
    }

    const reminder: HydrationReminder = {id: createReminderId(), hour, minute, weekdays, enabled: true};
    await scheduleReminder(reminder.id, hour, minute, weekdays);
    updateReminders([...reminders, reminder], set);
  },
  async toggleReminder(id, enabled) {
    const reminder = get().reminders.find(item => item.id === id);
    if (!reminder || reminder.enabled === enabled) return;

    if (enabled) {
      await scheduleReminder(reminder.id, reminder.hour, reminder.minute, reminder.weekdays);
    } else {
      await cancelReminder(reminder.id);
    }

    updateReminders(
      get().reminders.map(item => item.id === id ? {...item, enabled} : item),
      set,
    );
  },
  async removeReminder(id) {
    await cancelReminder(id);
    updateReminders(get().reminders.filter(reminder => reminder.id !== id), set);
  },
}));

function updateReminders(reminders: HydrationReminder[], set: (state: Partial<ReminderState>) => void): void {
  const sorted = [...reminders].sort((left, right) => left.hour * 60 + left.minute - (right.hour * 60 + right.minute));
  storage.set(remindersKey, JSON.stringify(sorted));
  set({reminders: sorted});
}

function loadReminders(): HydrationReminder[] {
  const serialized = storage.getString(remindersKey);
  if (!serialized) return [];

  try {
    const parsed = JSON.parse(serialized) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.map(parseReminder).filter((reminder): reminder is HydrationReminder => reminder !== undefined)
      .slice(0, maximumReminders).sort(
      (left, right) => left.hour * 60 + left.minute - (right.hour * 60 + right.minute),
    );
  } catch {
    return [];
  }
}

function parseReminder(value: unknown): HydrationReminder | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const reminder = value as Record<string, unknown>;
  if (
    typeof reminder.id !== 'string'
    || !Number.isInteger(reminder.hour) || Number(reminder.hour) < 0 || Number(reminder.hour) > 23
    || !Number.isInteger(reminder.minute) || Number(reminder.minute) < 0 || Number(reminder.minute) > 59
    || typeof reminder.enabled !== 'boolean'
  ) {
    return undefined;
  }

  // Records created before weekday selection existed represented daily reminders.
  const weekdays = reminder.weekdays === undefined
    ? [...ALL_REMINDER_WEEKDAYS]
    : normalizeReminderWeekdays(reminder.weekdays);
  if (weekdays.length === 0) return undefined;

  return {
    id: reminder.id,
    hour: Number(reminder.hour),
    minute: Number(reminder.minute),
    weekdays,
    enabled: reminder.enabled,
  };
}

function createReminderId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}
