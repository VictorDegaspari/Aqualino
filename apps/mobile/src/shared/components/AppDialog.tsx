import React, {useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {useAnimatedStyle, useReducedMotion, useSharedValue, withTiming} from 'react-native-reanimated';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';
import {AqualinoIcon, type AqualinoIconName} from './AqualinoIcon';
import {AppModal} from './AppModal';
import {BellIcon} from './BellIcon';

interface Props {
  title: string;
  message: string;
  icon?: AqualinoIconName | 'bell';
  illustration?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  error?: string;
  onConfirm?: () => void | boolean | Promise<void | boolean>;
  onClose: () => void;
}

export function AppDialog({title, message, icon = 'alert', illustration, confirmLabel = 'Entendi', cancelLabel, destructive, error, onConfirm, onClose}: Props): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const submitting = useRef(false);
  const reducedMotion = useReducedMotion();
  const entrance = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    entrance.value = reducedMotion ? 1 : withTiming(1, {duration: 180});
    AccessibilityInfo.announceForAccessibility(`${title}. ${message}`);
  }, [entrance, message, reducedMotion, title]);
  const cardStyle = useAnimatedStyle(() => ({opacity: entrance.value, transform: [{translateY: (1 - entrance.value) * 18}]}));

  const close = () => {if (!submitting.current) onClose();};
  const confirm = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setActionError(undefined);
    try {
      if (await onConfirm?.() !== false) onClose();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : 'Não foi possível concluir. Tente novamente.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <AppModal onRequestClose={close} dismissible={!busy}>
      <SafeAreaView style={styles.overlay}>
        <Pressable testID="dismiss-app-dialog" accessible={false} importantForAccessibility="no" disabled={busy} onPress={close} style={StyleSheet.absoluteFill} />
        <Animated.View accessibilityViewIsModal style={[styles.card, cardStyle]}>
          <ScrollView bounces={false} contentContainerStyle={styles.content}>
            {illustration ?? <View style={[styles.icon, destructive && styles.dangerIcon]}>
              {icon === 'bell'
                ? <BellIcon size={32} color={destructive ? challengeTheme.colors.danger : challengeTheme.colors.cyanStrong} />
                : <AqualinoIcon name={icon} size={32} color={destructive ? challengeTheme.colors.danger : challengeTheme.colors.cyanStrong} />}
            </View>}
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            {actionError || error ? <Text accessibilityRole="alert" style={styles.error}>{actionError ?? error}</Text> : null}
            <Pressable
              accessibilityRole="button" accessibilityLabel={confirmLabel} accessibilityState={{disabled: busy, busy}}
              disabled={busy} onPress={() => {confirm();}}
              style={({pressed}) => [styles.button, destructive && styles.dangerButton, pressed && styles.pressed, busy && styles.busy]}>
              {busy ? <ActivityIndicator color={challengeTheme.colors.backgroundDeep} /> : null}
              <Text style={styles.buttonLabel}>{confirmLabel}</Text>
            </Pressable>
            {cancelLabel ? <Pressable accessibilityRole="button" disabled={busy} onPress={close} style={({pressed}) => [styles.button, styles.cancelButton, pressed && styles.pressed, busy && styles.busy]}>
              <Text style={styles.cancelLabel}>{cancelLabel}</Text>
            </Pressable> : null}
          </ScrollView>
        </Animated.View>
      </SafeAreaView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'center', paddingHorizontal: 22, backgroundColor: 'rgba(0, 10, 24, 0.8)'},
  card: {maxHeight: '90%', width: '100%', maxWidth: 440, alignSelf: 'center', borderRadius: 28, overflow: 'hidden', backgroundColor: challengeTheme.colors.background, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong},
  content: {padding: 24, gap: 14, alignItems: 'center'},
  icon: {width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panelSoft},
  dangerIcon: {backgroundColor: 'rgba(166, 42, 63, 0.16)', borderColor: 'rgba(255, 148, 164, 0.35)'},
  title: {fontSize: 23, lineHeight: 30, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  message: {fontSize: 15, lineHeight: 22, color: challengeTheme.colors.muted, textAlign: 'center'},
  error: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.danger, textAlign: 'center'},
  button: {width: '100%', minHeight: 52, paddingHorizontal: 18, paddingVertical: 14, borderRadius: 26, backgroundColor: challengeTheme.colors.cyanStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10},
  dangerButton: {backgroundColor: challengeTheme.colors.danger},
  buttonLabel: {fontSize: 15, lineHeight: 21, fontWeight: '900', textAlign: 'center', color: challengeTheme.colors.backgroundDeep},
  cancelButton: {backgroundColor: challengeTheme.colors.panelSoft, borderWidth: 1, borderColor: challengeTheme.colors.border},
  cancelLabel: {fontSize: 15, lineHeight: 21, fontWeight: '800', color: challengeTheme.colors.text},
  pressed: {opacity: 0.8}, busy: {opacity: 0.6},
});
