import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {AqualinoIcon} from '../../../../shared/components/AqualinoIcon';
import {challengeTheme} from './challengeTheme';

export type ChallengeMode = 'group' | 'solo';

interface Props {
  mode: ChallengeMode;
  onChange: (mode: ChallengeMode) => void;
}

export function ChallengeModeToggle({mode, onChange}: Props): React.JSX.Element {
  return (
    <View accessibilityRole="tablist" style={styles.container}>
      <Mode active={mode === 'group'} icon="group" label="Grupo" onPress={() => onChange('group')} />
      <Mode active={mode === 'solo'} icon="person" label="Solo" onPress={() => onChange('solo')} />
    </View>
  );
}

function Mode({active, icon, label, onPress}: {active: boolean; icon: 'group' | 'person'; label: string; onPress: () => void}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{selected: active}}
      onPress={onPress}
      style={({pressed}) => [styles.mode, active && styles.active, pressed && styles.pressed]}>
      <AqualinoIcon name={icon} size={20} color={active ? '#E9FFFF' : challengeTheme.colors.muted} />
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
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
  label: {fontSize: 16, lineHeight: 20, color: challengeTheme.colors.muted, fontWeight: '700'},
  activeLabel: {color: challengeTheme.colors.text, fontWeight: '900'},
  pressed: {opacity: 0.75},
});
