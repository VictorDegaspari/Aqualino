import {useTranslation} from '../../../../shared/i18n/useTranslation';
import type {HydrationWeekDay} from '@aqualino/contracts';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AqualinoIcon, type AqualinoIconName} from '../../../../shared/components/AqualinoIcon';
import {challengeDateLabel, dayStateLabel, weekdayLabel} from './challengeLocale';
import type {AppLocale} from '../../../../shared/i18n/appLocale';
import {challengeTheme} from './challengeTheme';

interface Props {
  day?: HydrationWeekDay;
  index: number;
  onClose: () => void;
}

export function DayDetailsModal({day, onClose}: Props): React.JSX.Element {
  const {locale, t} = useTranslation();
  const sheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const safePercentage = Math.min(100, Math.max(0, day?.percentage ?? 0));
  const fillStyle = useMemo<ViewStyle>(() => ({width: `${safePercentage}%`}), [safePercentage]);
  const cardInset = useMemo<ViewStyle>(() => ({paddingBottom: Math.max(18, insets.bottom + 10)}), [insets.bottom]);
  const renderBackdrop = useCallback((props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.72}
      pressBehavior="close"
    />
  ), []);
  const dismiss = useCallback(() => sheetRef.current?.dismiss(), []);

  useEffect(() => {
    if (day) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [day]);

  if (!day) {
    return <></>;
  }

  const details = getDetails(day, locale, t);
  return (
    <BottomSheetModal
      ref={sheetRef}
      accessibilityLabel={t("Detalhes de hidratação do dia", "Daily hydration details", "Detalles de hidratación del día")}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      enableDynamicSizing
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      maxDynamicContentSize={440}
      onDismiss={onClose}
      style={styles.sheet}>
      <BottomSheetView accessibilityViewIsModal style={[styles.card, cardInset]}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={styles.title}>{weekdayLabel(day.weekday, locale)} • {challengeDateLabel(day.date, locale)}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={t("Fechar", "Close", "Cerrar")} onPress={dismiss} style={styles.close}>
            <Text style={styles.closeText}>{t("Fechar", "Close", "Cerrar")}</Text>
          </Pressable>
        </View>

        <View style={styles.amountRow}>
          <AqualinoIcon name="water" size={31} />
          <Text style={styles.amount}>{day.total_ml.toLocaleString(locale)} ml</Text>
        </View>
        <View style={styles.goalRow}>
          <Text style={styles.muted}>{t("Meta", "Goal", "Meta")}</Text>
          <Text style={styles.goal}>{day.goal_ml.toLocaleString(locale)} ml</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, fillStyle]} />
        </View>
        <Text style={styles.percentage}>{t(`${Math.round(day.percentage)}% da meta`, `${Math.round(day.percentage)}% of goal`, `${Math.round(day.percentage)}% de la meta`)}</Text>

        <View style={styles.statusRow}>
          <AqualinoIcon name={details.icon} size={22} color={details.color} />
          <View style={styles.statusCopy}>
            <Text style={[styles.status, {color: details.color}]}>{details.status}</Text>
            {details.complement ? <Text style={styles.complement}>{details.complement}</Text> : null}
            {day.protection ? <Text style={styles.protection}>{protectionLabel(day.protection, t)}</Text> : null}
          </View>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

function getDetails(day: HydrationWeekDay, locale: AppLocale, t: (pt: string, en: string, es: string) => string): {status: string; complement?: string; icon: AqualinoIconName; color: string} {
  const missing = Math.max(0, day.goal_ml - day.total_ml);
  if (day.state === 'future') {
    return {status: t("Dia ainda não iniciado", "Day has not started yet", "El día aún no ha empezado"), icon: 'lock', color: challengeTheme.colors.muted};
  }
  if (day.state === 'goal_achieved') {
    return {status: t("Meta atingida", "Goal reached", "Meta alcanzada"), icon: 'check', color: challengeTheme.colors.cyanStrong};
  }
  if (day.state === 'missed') {
    return {status: t("Meta não atingida", "Goal not reached", "Meta no alcanzada"), complement: t(`Faltaram ${missing.toLocaleString(locale)} ml`, `${missing.toLocaleString(locale)} ml short`, `Faltaron ${missing.toLocaleString(locale)} ml`), icon: 'alert', color: '#F0A1B7'};
  }
  if (day.state === 'in_progress') {
    return {status: dayStateLabel('in_progress', locale), complement: t(`Faltam ${missing.toLocaleString(locale)} ml`, `${missing.toLocaleString(locale)} ml remaining`, `Faltan ${missing.toLocaleString(locale)} ml`), icon: 'waves', color: challengeTheme.colors.cyan};
  }
  return {
    status: day.is_today ? t("Nenhum registro hoje", "No logs today", "Sin registros hoy") : t("Meta não atingida", "Goal not reached", "Meta no alcanzada"),
    complement: t(`Faltam ${missing.toLocaleString(locale)} ml`, `${missing.toLocaleString(locale)} ml remaining`, `Faltan ${missing.toLocaleString(locale)} ml`), icon: 'water', color: challengeTheme.colors.muted,
  };
}

function protectionLabel(protection: HydrationWeekDay['protection'], t: (pt: string, en: string, es: string) => string): string {
  return protection === 'streak_freeze' ? t("Streak protegido por congelamento", "Streak protected by freeze", "Racha protegida por congelamiento") : t("Streak recuperado por poção", "Streak recovered by potion", "Racha recuperada con una poción");
}


const styles = StyleSheet.create({
  sheet: {shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: {width: 0, height: -5}, elevation: 18},
  sheetBackground: {
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    borderWidth: 2, borderBottomWidth: 0, borderColor: challengeTheme.colors.borderStrong,
    backgroundColor: '#001B39',
  },
  handleIndicator: {width: 43, height: 4, backgroundColor: '#3C7192'},
  card: {
    paddingHorizontal: 22, paddingTop: 5,
  },
  heading: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  title: {fontSize: 21, lineHeight: 27, fontWeight: '900', color: challengeTheme.colors.text},
  close: {minWidth: 52, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center'},
  closeText: {fontSize: 13, color: challengeTheme.colors.cyan, fontWeight: '800'},
  amountRow: {marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 10},
  amount: {fontSize: 25, lineHeight: 31, color: challengeTheme.colors.cyanStrong, fontWeight: '900'},
  goalRow: {marginTop: 12, flexDirection: 'row', justifyContent: 'space-between'},
  muted: {fontSize: 13, color: challengeTheme.colors.muted},
  goal: {fontSize: 13, color: challengeTheme.colors.text, fontWeight: '800'},
  track: {height: 9, marginTop: 7, overflow: 'hidden', borderRadius: 5, backgroundColor: '#103956'},
  fill: {height: '100%', borderRadius: 5, backgroundColor: challengeTheme.colors.cyan},
  percentage: {marginTop: 5, textAlign: 'right', fontSize: 12, color: challengeTheme.colors.cyan, fontWeight: '800'},
  statusRow: {marginTop: 15, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 16, backgroundColor: 'rgba(4, 42, 72, 0.72)'},
  statusCopy: {flex: 1},
  status: {fontSize: 15, lineHeight: 20, fontWeight: '900'},
  complement: {marginTop: 2, color: '#B4CCE1', fontSize: 12},
  protection: {marginTop: 5, color: challengeTheme.colors.cyan, fontSize: 10, fontWeight: '700'},
});
