import {trigger, type HapticFeedbackTypes} from 'react-native-haptic-feedback';

const options = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
} as const;

function play(type: keyof typeof HapticFeedbackTypes): void {
  try {
    trigger(type, options);
  } catch {
    // Haptics are an enhancement and must never block the primary action.
  }
}

export const haptics = {
  selection: () => play('selection'),
  lightImpact: () => play('impactLight'),
  success: () => play('notificationSuccess'),
} as const;
