import React, {useCallback, useEffect, useRef} from 'react';
import {AccessibilityInfo, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Animated, {cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withSpring, withTiming} from 'react-native-reanimated';
import {scheduleOnRN} from 'react-native-worklets';
import type {Achievement} from '@aqualino/contracts';
import type {AppLocale} from '../../../shared/i18n/appLocale';
import {haptics} from '../../../shared/device/haptics';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {AchievementMedal} from './AchievementMedal';
import type {AchievementCopy} from './achievementCopy';
import {AppModal} from '../../../shared/components/AppModal';

export function AchievementModal({achievement, copy, locale, celebration = false, onClose}: {
  achievement: Achievement; copy: AchievementCopy; locale: AppLocale; celebration?: boolean; onClose: () => void;
}): React.JSX.Element {
  const {height} = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const reveal = useSharedValue(0);
  const float = useSharedValue(0);
  const closing = useRef(false);
  const itemCopy = copy.items[achievement.code];
  const unlocked = Boolean(achievement.unlocked_at);
  useEffect(() => {
    reveal.value = reducedMotion ? 1 : withSpring(1, {damping: 18, stiffness: 170, mass: 0.85});
    if (celebration && !reducedMotion) float.value = withRepeat(withSequence(withTiming(-5, {duration: 1800, easing: Easing.inOut(Easing.sin)}), withTiming(5, {duration: 1800, easing: Easing.inOut(Easing.sin)})), -1, true);
    if (celebration) haptics.success();
    AccessibilityInfo.announceForAccessibility(`${celebration ? copy.newAchievement : copy.title}. ${itemCopy.title}. ${celebration ? itemCopy.celebration : itemCopy.description}`);
    return () => {cancelAnimation(reveal); cancelAnimation(float);};
  }, [celebration, copy, float, itemCopy, reducedMotion, reveal]);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    cancelAnimation(float);
    if (reducedMotion) {onClose(); return;}
    reveal.value = withTiming(0, {duration: 160}, finished => {if (finished) scheduleOnRN(onClose);});
  }, [float, onClose, reducedMotion, reveal]);
  const backdropStyle = useAnimatedStyle(() => ({opacity: Math.min(1, reveal.value)}));
  const cardStyle = useAnimatedStyle(() => ({opacity: Math.min(1, reveal.value), transform: [{translateY: (1 - reveal.value) * 38}, {scale: 0.88 + reveal.value * 0.12}]}));
  const medalStyle = useAnimatedStyle(() => ({transform: [{translateY: float.value}, {rotateZ: `${float.value * 0.4}deg`}]}));

  return (
    <AppModal onRequestClose={close}>
      <View style={styles.modal}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.center} bounces={false}>
            <Animated.View accessibilityViewIsModal onAccessibilityEscape={close} style={[styles.card, cardStyle]}>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.close} onPress={close} style={styles.close}>
                <Text style={styles.closeText}>×</Text>
              </Pressable>
              <Text style={styles.eyebrow}>{celebration ? copy.newAchievement : unlocked ? copy.earnedBadge : copy.locked}</Text>
              <View style={styles.medalStage}>
                {unlocked ? <View style={styles.halo} /> : null}
                <Animated.View style={medalStyle}><AchievementMedal achievement={achievement} size={Math.min(240, height * 0.3)} /></Animated.View>
              </View>
              {celebration ? <Text style={styles.congratulations}>{copy.congratulations}</Text> : null}
              <Text accessibilityRole="header" style={styles.title}>{itemCopy.title}</Text>
              <Text style={styles.description}>{celebration ? itemCopy.celebration : itemCopy.description}</Text>
              {unlocked && achievement.unlocked_at ? (
                <Text style={styles.caption}>{copy.unlockedOn(new Date(achievement.unlocked_at).toLocaleDateString(locale))}</Text>
              ) : (
                <View style={styles.progressPanel}>
                  <Text style={styles.caption}>{copy.progress}: {copy.progressLabel(achievement.progress, achievement.target)}</Text>
                  <View accessible accessibilityRole="progressbar" accessibilityLabel={copy.progress} accessibilityValue={{min: 0, max: achievement.target, now: achievement.progress}} style={styles.track}>
                    <View style={[styles.fill, {width: `${Math.min(100, achievement.progress / achievement.target * 100)}%`}]} />
                  </View>
                </View>
              )}
              <Pressable accessibilityRole="button" onPress={close} style={({pressed}) => [styles.button, pressed && styles.pressed]}>
                <Text style={styles.buttonLabel}>{celebration ? copy.continue : copy.close}</Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  modal: {flex: 1}, backdrop: {backgroundColor: 'rgba(0, 9, 18, 0.9)'}, safeArea: {flex: 1},
  center: {flexGrow: 1, justifyContent: 'center', padding: 22},
  card: {width: '100%', maxWidth: 440, alignSelf: 'center', alignItems: 'center', gap: 12, borderRadius: 30, padding: 24, paddingTop: 42, backgroundColor: '#102E3B', borderWidth: 1, borderColor: '#55868B'},
  close: {position: 'absolute', top: 2, right: 3, width: 48, height: 48, alignItems: 'center', justifyContent: 'center'},
  closeText: {fontSize: 30, color: challengeTheme.colors.muted},
  eyebrow: {fontSize: 11, fontWeight: '900', letterSpacing: 2, color: '#E7C478', textAlign: 'center'},
  medalStage: {alignItems: 'center', justifyContent: 'center', marginVertical: 4},
  halo: {position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(145,200,209,0.25)', backgroundColor: 'rgba(145,200,209,0.06)'},
  congratulations: {fontSize: 13, fontWeight: '800', color: challengeTheme.colors.cyanStrong},
  title: {fontSize: 27, lineHeight: 34, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  description: {fontSize: 15, lineHeight: 22, textAlign: 'center', color: challengeTheme.colors.muted},
  caption: {fontSize: 12, lineHeight: 18, textAlign: 'center', color: challengeTheme.colors.muted},
  progressPanel: {width: '100%', gap: 9}, track: {height: 7, width: '100%', borderRadius: 4, overflow: 'hidden', backgroundColor: challengeTheme.colors.backgroundDeep},
  fill: {height: '100%', backgroundColor: challengeTheme.colors.cyanStrong, borderRadius: 4},
  button: {width: '100%', minHeight: 52, marginTop: 8, borderRadius: 26, padding: 14, backgroundColor: challengeTheme.colors.cyanStrong, alignItems: 'center', justifyContent: 'center'},
  buttonLabel: {fontSize: 16, fontWeight: '900', color: challengeTheme.colors.backgroundDeep}, pressed: {opacity: 0.8},
});
