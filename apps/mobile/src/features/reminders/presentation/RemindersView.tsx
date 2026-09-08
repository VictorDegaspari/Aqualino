import {useTranslation} from '../../../shared/i18n/useTranslation';
import React, {memo, useCallback, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {AppSwitch} from '../../../shared/components/AppSwitch';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BellIcon} from '../../../shared/components/BellIcon';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {TabScreenHeader} from '../../../shared/components/TabScreenHeader';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import type {HydrationReminder} from '../application/reminderStore';
import type {ReminderPermissionIssue} from '../application/reminderNotificationService';
import {
  ALL_REMINDER_WEEKDAYS,
  formatReminderWeekdays,
  normalizeReminderWeekdays,
  reminderWeekdayOptions,
  type ReminderWeekday,
} from '../application/reminderWeekdays';

interface Props {
  reminders: HydrationReminder[];
  busyId?: string;
  feedback?: {kind: 'success' | 'error'; message: string};
  permissionIssue?: ReminderPermissionIssue;
  onAdd: (hour: number, minute: number, weekdays: readonly ReminderWeekday[]) => Promise<boolean>;
  onToggle: (id: string, enabled: boolean) => void | Promise<boolean>;
  onRemove: (reminder: HydrationReminder) => void;
  onOpenSettings: () => void;
}

const suggestedTimes = ['08:00', '12:00', '16:00', '20:00'] as const;

export function RemindersView(props: Props): React.JSX.Element {
  const {locale, t} = useTranslation();
  const [editing, setEditing] = useState(false);
  const [hour, setHour] = useState('08');
  const [minute, setMinute] = useState('00');
  const [weekdays, setWeekdays] = useState<ReminderWeekday[]>([...ALL_REMINDER_WEEKDAYS]);
  const [validationError, setValidationError] = useState<string>();
  const activeCount = props.reminders.filter(reminder => reminder.enabled).length;
  const allWeekdaysSelected = weekdays.length === ALL_REMINDER_WEEKDAYS.length;

  const selectSuggestion = (time: string) => {
    const [nextHour, nextMinute] = time.split(':');
    setHour(nextHour);
    setMinute(nextMinute);
    setValidationError(undefined);
  };
  const toggleWeekday = (weekday: ReminderWeekday) => {
    setWeekdays(current => normalizeReminderWeekdays(
      current.includes(weekday) ? current.filter(value => value !== weekday) : [...current, weekday],
    ));
    setValidationError(undefined);
  };
  const toggleAllWeekdays = () => {
    setWeekdays(allWeekdaysSelected ? [] : [...ALL_REMINDER_WEEKDAYS]);
    setValidationError(undefined);
  };
  const closeEditor = () => {
    setEditing(false);
    setWeekdays([...ALL_REMINDER_WEEKDAYS]);
    setValidationError(undefined);
  };
  const save = async () => {
    const parsedHour = Number(hour);
    const parsedMinute = Number(minute);
    if (!/^\d{1,2}$/.test(hour) || !Number.isInteger(parsedHour) || parsedHour < 0 || parsedHour > 23) {
      setValidationError(t("Informe uma hora entre 00 e 23.", "Enter an hour between 00 and 23.", "Introduce una hora entre 00 y 23."));
      return;
    }
    if (!/^\d{1,2}$/.test(minute) || !Number.isInteger(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
      setValidationError(t("Informe minutos entre 00 e 59.", "Enter minutes between 00 and 59.", "Introduce minutos entre 00 y 59."));
      return;
    }
    if (weekdays.length === 0) {
      setValidationError(t("Selecione pelo menos um dia da semana.", "Select at least one day of the week.", "Selecciona al menos un día de la semana."));
      return;
    }

    setValidationError(undefined);
    if (await props.onAdd(parsedHour, parsedMinute, weekdays)) {
      closeEditor();
    }
  };

  return (
    <View style={styles.page}>
      <Image
        pointerEvents="none"
        source={require('../../../assets/challenge/static/ocean-background.webp')}
        resizeMode="cover"
        style={styles.background}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />

      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <TabScreenHeader
            title={t("Lembretes", "Reminders", "Recordatorios")}
            subtitle={t("Pequenas pausas ao longo do dia para manter o ritmo.", "Small breaks throughout the day to keep your rhythm.", "Pequeñas pausas durante el día para mantener el ritmo.")}
            icon={<BellIcon size={34} color={challengeTheme.colors.cyanStrong} />}
          />

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <AqualinoIcon name="water" size={30} color={challengeTheme.colors.cyanStrong} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryValue}>{activeCount}</Text>
              <Text style={styles.summaryLabel}>{activeCount === 1 ? t("lembrete ativo", "active reminder", "recordatorio activo") : t("lembretes ativos", "active reminders", "recordatorios activos")}</Text>
            </View>
            <View style={[styles.summaryStatus, activeCount > 0 && styles.summaryStatusActive]}>
              <Text style={[styles.summaryStatusText, activeCount > 0 && styles.summaryStatusTextActive]}>
                {activeCount > 0 ? t("ATIVO", "ACTIVE", "ACTIVO") : t("PAUSADO", "PAUSED", "EN PAUSA")}
              </Text>
            </View>
          </View>

          {props.permissionIssue ? (
            <View accessibilityRole="alert" style={styles.permissionCard}>
              <AqualinoIcon name="alert" size={22} color={challengeTheme.colors.gold} />
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>
                  {props.permissionIssue === 'notifications' ? t("Notificações desativadas", "Notifications disabled", "Notificaciones desactivadas") : t("Horários exatos desativados", "Exact alarms disabled", "Alarmas exactas desactivadas")}
                </Text>
                <Text style={styles.permissionText}>
                  {props.permissionIssue === 'notifications'
                    ? t("Libere as notificações do Aqualino para receber seus lembretes.", "Allow Aqualino notifications to receive your reminders.", "Permite las notificaciones de Aqualino para recibir tus recordatorios.")
                    : t("Libere alarmes e lembretes para os avisos chegarem no horário escolhido.", "Allow alarms and reminders to receive alerts at your chosen time.", "Permite las alarmas y los recordatorios para recibir los avisos a la hora elegida.")}
                </Text>
                <Pressable accessibilityRole="button" onPress={props.onOpenSettings} style={styles.settingsButton}>
                  <Text style={styles.settingsButtonLabel}>{t("Abrir ajustes", "Open settings", "Abrir ajustes")}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {props.feedback ? (
            <Text accessibilityRole="alert" style={props.feedback.kind === 'error' ? styles.feedbackError : styles.feedbackSuccess}>
              {props.feedback.message}
            </Text>
          ) : null}

          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>{t("Seus horários", "Your schedule", "Tus horarios")}</Text>
              <Text style={styles.sectionSubtitle}>{t("Configure os dias de cada lembrete.", "Set the days for each reminder.", "Configura los días de cada recordatorio.")}</Text>
            </View>
            {!editing ? (
              <Pressable testID="reminders-new" accessibilityRole="button" onPress={() => setEditing(true)} style={styles.addSmallButton}>
                <AqualinoIcon name="plus" size={15} color={challengeTheme.colors.backgroundDeep} />
                <Text style={styles.addSmallButtonLabel}>{t("Novo", "New", "Nuevo")}</Text>
              </Pressable>
            ) : null}
          </View>

          {editing ? (
            <View style={styles.editorCard}>
              <Text style={styles.editorTitle}>{t("Novo lembrete", "New reminder", "Nuevo recordatorio")}</Text>
              <Text style={styles.editorSubtitle}>{t("Escolha o horário e os dias em que deseja receber o aviso.", "Choose the time and days for your reminder.", "Elige la hora y los días en que quieres recibir el aviso.")}</Text>

              <View style={styles.timeEditor}>
                <View>
                  <Text style={styles.inputLabel}>{t("Hora", "Hour", "Hora")}</Text>
                  <TextInput
                    accessibilityLabel="Hora do lembrete"
                    keyboardType="number-pad"
                    maxLength={2}
                    onChangeText={setHour}
                    selectTextOnFocus
                    style={styles.timeInput}
                    value={hour}
                  />
                </View>
                <Text accessibilityElementsHidden style={styles.timeSeparator}>:</Text>
                <View>
                  <Text style={styles.inputLabel}>{t("Minuto", "Minute", "Minuto")}</Text>
                  <TextInput
                    accessibilityLabel="Minuto do lembrete"
                    keyboardType="number-pad"
                    maxLength={2}
                    onChangeText={setMinute}
                    selectTextOnFocus
                    style={styles.timeInput}
                    value={minute}
                  />
                </View>
              </View>

              <View style={styles.suggestions}>
                {suggestedTimes.map(time => (
                  <Pressable
                    accessibilityRole="button"
                    key={time}
                    onPress={() => selectSuggestion(time)}
                    style={({pressed}) => [styles.suggestion, pressed && styles.buttonPressed]}>
                    <Text style={styles.suggestionLabel}>{time}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.weekdaysHeading}>
                <Text style={styles.weekdaysTitle}>{t("Dias da semana", "Days of the week", "Días de la semana")}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={allWeekdaysSelected ? 'Limpar seleção de dias' : 'Selecionar todos os dias'}
                  onPress={toggleAllWeekdays}
                  style={({pressed}) => pressed && styles.buttonPressed}>
                  <Text style={styles.weekdaysToggleLabel}>{allWeekdaysSelected ? t("Limpar", "Clear", "Borrar") : t("Todos", "All", "Todos")}</Text>
                </Pressable>
              </View>
              <View style={styles.weekdayOptions}>
                {reminderWeekdayOptions(locale).map(option => {
                  const selected = weekdays.includes(option.value);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityLabel={option.accessibilityLabel}
                      accessibilityState={{checked: selected}}
                      key={option.value}
                      onPress={() => toggleWeekday(option.value)}
                      style={({pressed}) => [
                        styles.weekdayButton,
                        selected && styles.weekdayButtonSelected,
                        pressed && styles.buttonPressed,
                      ]}>
                      <Text style={[styles.weekdayButtonLabel, selected && styles.weekdayButtonLabelSelected]}>
                        {option.shortLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {validationError ? <Text accessibilityRole="alert" style={styles.validationError}>{validationError}</Text> : null}

              <View style={styles.editorActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={props.busyId === 'new'}
                  onPress={closeEditor}
                  style={styles.cancelButton}>
                  <Text style={styles.cancelButtonLabel}>{t("Cancelar", "Cancel", "Cancelar")}</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{busy: props.busyId === 'new'}}
                  disabled={props.busyId === 'new'}
                  onPress={save}
                  style={({pressed}) => [styles.saveButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.saveButtonLabel}>{props.busyId === 'new' ? t("Salvando…", "Saving…", "Guardando…") : t("Salvar lembrete", "Save reminder", "Guardar recordatorio")}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {props.reminders.length === 0 && !editing ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}><BellIcon size={28} color={challengeTheme.colors.muted} /></View>
              <Text style={styles.emptyTitle}>{t("Nenhum horário marcado", "No reminders scheduled", "Ningún recordatorio programado")}</Text>
              <Text style={styles.emptyText}>{t("Crie seu primeiro lembrete. A permissão só será solicitada ao ativá-lo.", "Create your first reminder. Permission will be requested when you activate it.", "Crea tu primer recordatorio. El permiso se solicitará al activarlo.")}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setEditing(true)}
                style={({pressed}) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                <AqualinoIcon name="plus" size={19} color={challengeTheme.colors.backgroundDeep} />
                <Text style={styles.primaryButtonLabel}>{t("Criar lembrete", "Create reminder", "Crear recordatorio")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.reminders}>
              {props.reminders.map(reminder => (
                <ReminderCard
                  busy={props.busyId === reminder.id}
                  key={reminder.id}
                  reminder={reminder}
                  onRemove={props.onRemove}
                  onToggle={props.onToggle}
                />
              ))}
            </View>
          )}

          <View style={styles.infoCard}>
            <AqualinoIcon name="check" size={19} color={challengeTheme.colors.cyanStrong} />
            <Text style={styles.infoText}>{t("Os horários ficam salvos neste aparelho e funcionam mesmo quando o Aqualino está fechado.", "Reminders are saved on this device and work even when Aqualino is closed.", "Los horarios se guardan en este dispositivo y funcionan incluso cuando Aqualino está cerrado.")}</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const ReminderCard = memo(function ReminderCardView({reminder, busy, onToggle, onRemove}: {
  reminder: HydrationReminder;
  busy: boolean;
  onToggle: (id: string, enabled: boolean) => void | Promise<boolean>;
  onRemove: (reminder: HydrationReminder) => void;
}): React.JSX.Element {
  const {locale, t} = useTranslation();
  const handleToggle = useCallback((enabled: boolean) => onToggle(reminder.id, enabled), [onToggle, reminder.id]);
  const handleRemove = useCallback(() => onRemove(reminder), [onRemove, reminder]);

  return (
    <View style={[styles.reminderCard, !reminder.enabled && styles.reminderCardDisabled]}>
      <View style={styles.reminderTimeContent}>
        <Text style={[styles.reminderTime, !reminder.enabled && styles.reminderTimeDisabled]}>{formatTime(reminder)}</Text>
        <Text style={styles.reminderFrequency}>{formatReminderWeekdays(reminder.weekdays, locale)}</Text>
      </View>
      <AppSwitch
        accessibilityLabel={t(`Lembrete das ${formatTime(reminder)}`, `Reminder at ${formatTime(reminder)}`, `Recordatorio de las ${formatTime(reminder)}`)}
        disabled={busy}
        onValueChange={handleToggle}
        value={reminder.enabled}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`Remover lembrete das ${formatTime(reminder)}`, `Remove reminder at ${formatTime(reminder)}`, `Eliminar recordatorio de las ${formatTime(reminder)}`)}
        disabled={busy}
        onPress={handleRemove}
        style={({pressed}) => [styles.removeButton, pressed && styles.buttonPressed]}>
        <Text style={styles.removeButtonLabel}>{t("Remover", "Remove", "Eliminar")}</Text>
      </Pressable>
    </View>
  );
});

function formatTime(reminder: Pick<HydrationReminder, 'hour' | 'minute'>): string {
  return `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.62},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.64)'},
  safeArea: {flex: 1},
  content: {paddingHorizontal: 20, paddingTop: 18, paddingBottom: 30, gap: 17},
  summaryCard: {
    minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16,
    borderRadius: challengeTheme.radius.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong,
    backgroundColor: challengeTheme.colors.panel,
  },
  summaryIcon: {width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11, 225, 236, 0.12)'},
  summaryContent: {flex: 1},
  summaryValue: {fontSize: 27, lineHeight: 31, fontWeight: '900', color: challengeTheme.colors.text},
  summaryLabel: {fontSize: 12, lineHeight: 16, color: challengeTheme.colors.muted},
  summaryStatus: {paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99, backgroundColor: 'rgba(141, 171, 200, 0.12)'},
  summaryStatusActive: {backgroundColor: 'rgba(11, 225, 236, 0.13)'},
  summaryStatusText: {fontSize: 9, lineHeight: 12, fontWeight: '900', letterSpacing: 0.6, color: challengeTheme.colors.muted},
  summaryStatusTextActive: {color: challengeTheme.colors.cyanStrong},
  permissionCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 15, borderRadius: 18,
    borderWidth: 1, borderColor: 'rgba(255, 191, 35, 0.4)', backgroundColor: 'rgba(77, 52, 4, 0.5)',
  },
  permissionContent: {flex: 1},
  permissionTitle: {fontSize: 14, lineHeight: 19, fontWeight: '900', color: challengeTheme.colors.text},
  permissionText: {marginTop: 3, fontSize: 12, lineHeight: 17, color: '#D9C99A'},
  settingsButton: {alignSelf: 'flex-start', marginTop: 9, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: challengeTheme.colors.gold},
  settingsButtonLabel: {fontSize: 11, lineHeight: 15, fontWeight: '900', color: challengeTheme.colors.gold},
  feedbackError: {padding: 11, borderRadius: 12, color: challengeTheme.colors.danger, backgroundColor: 'rgba(90, 18, 37, 0.52)'},
  feedbackSuccess: {padding: 11, borderRadius: 12, color: challengeTheme.colors.cyanStrong, backgroundColor: 'rgba(3, 68, 73, 0.5)'},
  sectionHeading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sectionTitle: {fontSize: 19, lineHeight: 25, fontWeight: '900', color: challengeTheme.colors.text},
  sectionSubtitle: {fontSize: 11, lineHeight: 16, color: challengeTheme.colors.muted},
  addSmallButton: {minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, borderRadius: 99, backgroundColor: challengeTheme.colors.cyanStrong},
  addSmallButtonLabel: {fontSize: 12, lineHeight: 16, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  editorCard: {padding: 18, borderRadius: challengeTheme.radius.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel},
  editorTitle: {fontSize: 18, lineHeight: 24, fontWeight: '900', color: challengeTheme.colors.text},
  editorSubtitle: {marginTop: 3, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  timeEditor: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginTop: 17},
  inputLabel: {marginBottom: 5, fontSize: 10, lineHeight: 13, fontWeight: '800', color: challengeTheme.colors.muted, textAlign: 'center'},
  timeInput: {
    width: 74, height: 58, borderRadius: 16, borderWidth: 1.5, borderColor: challengeTheme.colors.borderStrong,
    backgroundColor: challengeTheme.colors.backgroundDeep, color: challengeTheme.colors.text,
    fontSize: 28, fontWeight: '900', textAlign: 'center', paddingVertical: 7,
  },
  timeSeparator: {height: 53, fontSize: 30, lineHeight: 40, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  suggestions: {flexDirection: 'row', justifyContent: 'center', gap: 7, marginTop: 14},
  suggestion: {paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panelSoft},
  suggestionLabel: {fontSize: 11, lineHeight: 15, fontWeight: '800', color: challengeTheme.colors.cyanStrong},
  weekdaysHeading: {marginTop: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  weekdaysTitle: {fontSize: 12, lineHeight: 17, fontWeight: '800', color: challengeTheme.colors.text},
  weekdaysToggleLabel: {fontSize: 11, lineHeight: 15, fontWeight: '800', color: challengeTheme.colors.cyanStrong},
  weekdayOptions: {marginTop: 9, flexDirection: 'row', flexWrap: 'wrap', gap: 7},
  weekdayButton: {
    flexGrow: 1, minWidth: 58, minHeight: 40, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, borderRadius: 13, borderWidth: 1, borderColor: challengeTheme.colors.border,
    backgroundColor: challengeTheme.colors.panelSoft,
  },
  weekdayButtonSelected: {borderColor: challengeTheme.colors.cyanStrong, backgroundColor: 'rgba(11, 225, 236, 0.16)'},
  weekdayButtonLabel: {fontSize: 11, lineHeight: 15, fontWeight: '800', color: challengeTheme.colors.muted},
  weekdayButtonLabelSelected: {color: challengeTheme.colors.cyanStrong},
  validationError: {marginTop: 10, textAlign: 'center', fontSize: 12, lineHeight: 17, color: challengeTheme.colors.danger},
  editorActions: {flexDirection: 'row', gap: 9, marginTop: 17},
  cancelButton: {flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 99, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong},
  cancelButtonLabel: {fontSize: 13, lineHeight: 18, fontWeight: '900', color: challengeTheme.colors.muted},
  saveButton: {flex: 1.7, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 99, backgroundColor: challengeTheme.colors.cyanStrong},
  saveButtonLabel: {fontSize: 13, lineHeight: 18, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  emptyCard: {alignItems: 'center', padding: 21, borderRadius: challengeTheme.radius.panel, borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: 'rgba(0, 22, 49, 0.9)'},
  emptyIcon: {width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: challengeTheme.colors.panelSoft},
  emptyTitle: {marginTop: 11, fontSize: 17, lineHeight: 22, fontWeight: '900', color: challengeTheme.colors.text},
  emptyText: {maxWidth: 280, marginTop: 4, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted, textAlign: 'center'},
  primaryButton: {width: '100%', minHeight: 50, marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 99, backgroundColor: challengeTheme.colors.cyanStrong},
  primaryButtonLabel: {fontSize: 15, lineHeight: 20, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  reminders: {gap: 10},
  reminderCard: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: 16, borderRadius: 18, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel},
  reminderCardDisabled: {opacity: 0.66, borderColor: challengeTheme.colors.border},
  reminderTimeContent: {flex: 1},
  reminderTime: {fontSize: 28, lineHeight: 33, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  reminderTimeDisabled: {color: challengeTheme.colors.muted},
  reminderFrequency: {fontSize: 11, lineHeight: 15, color: challengeTheme.colors.muted},
  removeButton: {width: '100%', minHeight: 36, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderTopColor: challengeTheme.colors.border},
  removeButtonLabel: {fontSize: 11, lineHeight: 15, fontWeight: '800', color: challengeTheme.colors.danger},
  infoCard: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: 'rgba(3, 54, 78, 0.72)'},
  infoText: {flex: 1, fontSize: 11, lineHeight: 16, color: challengeTheme.colors.muted},
  buttonPressed: {opacity: 0.8, transform: [{scale: 0.985}]},
});
