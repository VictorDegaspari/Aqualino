import React, {memo} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AqualinoIcon} from '../../../../shared/components/AqualinoIcon';
import {haptics} from '../../../../shared/device/haptics';
import {challengeTheme} from './challengeTheme';

export type ChallengeMode = 'group' | 'solo';

interface Props {
  mode: ChallengeMode;
  groupAvailable?: boolean;
  onChange: (mode: ChallengeMode) => void;
}

export const ChallengeModeToggle = memo(function ChallengeModeToggleView({mode, groupAvailable = true, onChange}: Props): React.JSX.Element {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      <Mode active={mode === 'group'} icon="group" label="Grupo" locked={!groupAvailable} onPress={() => onChange('group')} />
      <Mode active={mode === 'solo'} icon="person" label="Solo" onPress={() => onChange('solo')} />
    </View>
  );
});

interface ModeProps {
  active: boolean;
  icon: 'group' | 'person';
  label: string;
  locked?: boolean;
  onPress: () => void;
}

function Mode({active, icon, label, locked = false, onPress}: ModeProps) {
  const handlePress = () => {
    if (active || locked) {
      return;
    }

    haptics.selection();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityHint={locked ? 'Entre em um grupo para desbloquear este modo' : undefined}
      accessibilityState={{selected: active, disabled: active || locked}}
      disabled={active || locked}
      onPress={handlePress}
      style={({pressed}) => [styles.mode, active && styles.active, locked && styles.locked, pressed && styles.pressed]}>
      <AqualinoIcon name={icon} size={20} color={active ? '#E9FFFF' : locked ? styles.lockedIcon.color : challengeTheme.colors.muted} />
      <Text style={[styles.label, active && styles.activeLabel, locked && styles.lockedLabel]}>{label}</Text>
      {locked ? <AqualinoIcon name="lock" size={12} color={styles.lockedIcon.color} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center', width: '72%', minWidth: 250, maxWidth: 300, height: 40,
    flexDirection: 'row', borderRadius: 24, borderWidth: 2, borderColor: challengeTheme.colors.borderStrong,
    backgroundColor: 'rgba(0, 13, 35, 0.9)', overflow: 'hidden',
  },
  mode: {flex: 1, flexDirection: 'row', gap: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 23},
  active: {
    borderWidth: 2, borderColor: challengeTheme.colors.cyan, backgroundColor: 'rgba(0, 185, 215, 0.34)',
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.9, shadowRadius: 12,
    shadowOffset: {width: 0, height: 0}, elevation: 7,
  },
  locked: {opacity: 0.58, backgroundColor: 'rgba(3, 24, 49, 0.72)'},
  lockedIcon: {color: '#65829B'},
  label: {fontSize: 16, lineHeight: 20, color: challengeTheme.colors.muted, fontWeight: '700'},
  activeLabel: {color: challengeTheme.colors.text, fontWeight: '900'},
  lockedLabel: {color: '#65829B'},
  pressed: {opacity: 0.75},
});
