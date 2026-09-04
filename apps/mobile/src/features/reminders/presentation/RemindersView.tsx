import React, {memo, useCallback, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {BellIcon} from '../../../shared/components/BellIcon';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import type {HydrationReminder} from '../application/reminderStore';
import type {ReminderPermissionIssue} from '../application/reminderNotificationService';
import {
  ALL_REMINDER_WEEKDAYS,
  formatReminderWeekdays,
  normalizeReminderWeekdays,
  REMINDER_WEEKDAY_OPTIONS,
  type ReminderWeekday,
} from '../application/reminderWeekdays';

interface Props {
  reminders: HydrationReminder[];
  busyId?: string;
  feedback?: {kind: 'success' | 'error'; message: string};
  permissionIssue?: ReminderPermissionIssue;
  onAdd: (hour: number, minute: number, weekdays: readonly ReminderWeekday[]) => Promise<boolean>;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (reminder: HydrationReminder) => void;
  onOpenSettings: () => void;
}

const suggestedTimes = ['08:00', '12:00', '16:00', '20:00'] as const;

export function RemindersView(props: Props): React.JSX.Element {
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
      setValidationError('Informe uma hora entre 00 e 23.');
      return;
    }
    if (!/^\d{1,2}$/.test(minute) || !Number.isInteger(parsedMinute) || parsedMinute < 0 || parsedMinute > 59) {
      setValidationError('Informe minutos entre 00 e 59.');
      return;
    }
    if (weekdays.length === 0) {
      setValidationError('Selecione pelo menos um dia da semana.');
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
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <BellIcon size={38} color={challengeTheme.colors.cyanStrong} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>Lembretes</Text>
            <Text style={styles.subtitle}>Pequenas pausas ao longo do dia para você manter o ritmo.</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <AqualinoIcon name="water" size={30} color={challengeTheme.colors.cyanStrong} />
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryValue}>{activeCount}</Text>
              <Text style={styles.summaryLabel}>{activeCount === 1 ? 'lembrete ativo' : 'lembretes ativos'}</Text>
            </View>
            <View style={[styles.summaryStatus, activeCount > 0 && styles.summaryStatusActive]}>
              <Text style={[styles.summaryStatusText, activeCount > 0 && styles.summaryStatusTextActive]}>
                {activeCount > 0 ? 'ATIVO' : 'PAUSADO'}
              </Text>
            </View>
          </View>

          {props.permissionIssue ? (
            <View accessibilityRole="alert" style={styles.permissionCard}>
              <AqualinoIcon name="alert" size={22} color={challengeTheme.colors.gold} />
              <View style={styles.permissionContent}>
                <Text style={styles.permissionTitle}>
                  {props.permissionIssue === 'notifications' ? 'Notificações desativadas' : 'Horários exatos desativados'}
                </Text>
                <Text style={styles.permissionText}>
                  {props.permissionIssue === 'notifications'
                    ? 'Libere as notificações do Aqualino para receber seus lembretes.'
                    : 'Libere alarmes e lembretes para os avisos chegarem no horário escolhido.'}
                </Text>
                <Pressable accessibilityRole="button" onPress={props.onOpenSettings} style={styles.settingsButton}>
                  <Text style={styles.settingsButtonLabel}>Abrir ajustes</Text>
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
              <Text style={styles.sectionTitle}>Seus horários</Text>
              <Text style={styles.sectionSubtitle}>Configure os dias de cada lembrete.</Text>
            </View>
            {!editing ? (
              <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.addSmallButton}>
                <AqualinoIcon name="plus" size={15} color={challengeTheme.colors.backgroundDeep} />
                <Text style={styles.addSmallButtonLabel}>Novo</Text>
              </Pressable>
            ) : null}
          </View>

          {editing ? (
            <View style={styles.editorCard}>
              <Text style={styles.editorTitle}>Novo lembrete</Text>
              <Text style={styles.editorSubtitle}>Escolha o horário e os dias em que deseja receber o aviso.</Text>

              <View style={styles.timeEditor}>
                <View>
                  <Text style={styles.inputLabel}>Hora</Text>
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
                  <Text style={styles.inputLabel}>Minuto</Text>
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
                <Text style={styles.weekdaysTitle}>Dias da semana</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={allWeekdaysSelected ? 'Limpar seleção de dias' : 'Selecionar todos os dias'}
                  onPress={toggleAllWeekdays}
                  style={({pressed}) => pressed && styles.buttonPressed}>
                  <Text style={styles.weekdaysToggleLabel}>{allWeekdaysSelected ? 'Limpar' : 'Todos'}</Text>
                </Pressable>
              </View>
              <View style={styles.weekdayOptions}>
                {REMINDER_WEEKDAY_OPTIONS.map(option => {
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
                  <Text style={styles.cancelButtonLabel}>Cancelar</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{busy: props.busyId === 'new'}}
                  disabled={props.busyId === 'new'}
                  onPress={save}
                  style={({pressed}) => [styles.saveButton, pressed && styles.buttonPressed]}>
                  <Text style={styles.saveButtonLabel}>{props.busyId === 'new' ? 'Salvando…' : 'Salvar lembrete'}</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {props.reminders.length === 0 && !editing ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}><BellIcon size={28} color={challengeTheme.colors.muted} /></View>
              <Text style={styles.emptyTitle}>Nenhum horário marcado</Text>
              <Text style={styles.emptyText}>Crie seu primeiro lembrete. A permissão só será solicitada ao ativá-lo.</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setEditing(true)}
                style={({pressed}) => [styles.primaryButton, pressed && styles.buttonPressed]}>
                <AqualinoIcon name="plus" size={19} color={challengeTheme.colors.backgroundDeep} />
                <Text style={styles.primaryButtonLabel}>Criar lembrete</Text>
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
            <Text style={styles.infoText}>Os horários ficam salvos neste aparelho e funcionam mesmo quando o Aqualino está fechado.</Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const ReminderCard = memo(function ReminderCardView({reminder, busy, onToggle, onRemove}: {
  reminder: HydrationReminder;
  busy: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (reminder: HydrationReminder) => void;
}): React.JSX.Element {
  const handleToggle = useCallback((enabled: boolean) => onToggle(reminder.id, enabled), [onToggle, reminder.id]);
  const handleRemove = useCallback(() => onRemove(reminder), [onRemove, reminder]);

  return (
    <View style={[styles.reminderCard, !reminder.enabled && styles.reminderCardDisabled]}>
      <View style={styles.reminderTimeContent}>
        <Text style={[styles.reminderTime, !reminder.enabled && styles.reminderTimeDisabled]}>{formatTime(reminder)}</Text>
        <Text style={styles.reminderFrequency}>{formatReminderWeekdays(reminder.weekdays)}</Text>
      </View>
      <Switch
        accessibilityLabel={`Lembrete das ${formatTime(reminder)}`}
        disabled={busy}
        onValueChange={handleToggle}
        thumbColor={reminder.enabled ? challengeTheme.colors.cyanStrong : '#7890A5'}
        trackColor={{false: '#29465F', true: 'rgba(11, 225, 236, 0.45)'}}
        value={reminder.enabled}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remover lembrete das ${formatTime(reminder)}`}
        disabled={busy}
        onPress={handleRemove}
        style={({pressed}) => [styles.removeButton, pressed && styles.buttonPressed]}>
        <Text style={styles.removeButtonLabel}>Remover</Text>
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
  hero: {alignItems: 'center', gap: 7},
  heroIcon: {
    width: 68, height: 68, borderRadius: 34, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(11, 225, 236, 0.14)', borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.54)',
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: {width: 0, height: 2}, elevation: 8,
  },
  title: {fontSize: 30, lineHeight: 37, fontWeight: '900', color: challengeTheme.colors.text},
  subtitle: {maxWidth: 305, textAlign: 'center', fontSize: 15, lineHeight: 21, color: challengeTheme.colors.muted},
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
