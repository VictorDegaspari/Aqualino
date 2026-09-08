import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {LoadingWaterDrop} from '../../../shared/components/LoadingWaterDrop';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

export function GroupButton({label, onPress, disabled, busy, secondary}: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean;
}): React.JSX.Element {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{disabled: Boolean(disabled || busy), busy: Boolean(busy)}}
      disabled={disabled || busy} onPress={onPress}
      style={({pressed}) => [styles.button, secondary && styles.secondary, (disabled || busy) && styles.disabled, pressed && styles.pressed]}>
      {busy ? <LoadingWaterDrop size={23} /> : null}
      <Text style={[styles.label, secondary && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {width: '100%', minHeight: 50, borderRadius: 25, paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: challengeTheme.colors.cyanStrong},
  secondary: {backgroundColor: 'transparent', borderWidth: 1, borderColor: challengeTheme.colors.borderStrong},
  label: {fontSize: 15, fontWeight: '900', color: challengeTheme.colors.backgroundDeep, textAlign: 'center'},
  secondaryLabel: {color: challengeTheme.colors.cyanStrong},
  disabled: {opacity: 0.5}, pressed: {opacity: 0.8},
});
