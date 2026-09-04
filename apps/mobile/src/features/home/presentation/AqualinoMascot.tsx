import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import type {MascotCondition} from '@aqualino/contracts';
import {tokens} from '@aqualino/design-tokens';

const mascotImage = require('../../../assets/mascot/static/aqualino_happy.png');

const labels: Record<MascotCondition, string> = {
  empty: 'Aqualino está pronto para começar',
  happy: 'Aqualino está feliz',
  angry: 'Aqualino quer lembrar você com carinho',
  boiling: 'Aqualino está fervendo de saudade',
  skeleton: 'Aqualino sentiu sua falta',
};

interface Props {
  condition: MascotCondition;
  compact?: boolean;
}

export function AqualinoMascot({condition, compact = false}: Props): React.JSX.Element {
  return (
    <View style={[styles.container, compact && styles.compact]} accessibilityLabel={labels[condition]}>
      <View style={[styles.glow, compact && styles.glowCompact]}>
        <Image source={mascotImage} resizeMode="contain" style={[styles.mascot, compact && styles.mascotCompact]} />
      </View>
      {!compact ? <Text style={styles.label}>{labels[condition]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', gap: tokens.spacing.sm},
  compact: {gap: 0},
  glow: {
    width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#064A75', borderWidth: 3, borderColor: '#08CDE0',
    shadowColor: '#00DDF3', shadowOpacity: 0.7, shadowRadius: 12,
    shadowOffset: {width: 0, height: 0}, elevation: 7,
  },
  glowCompact: {width: 58, height: 58, borderRadius: 29, borderWidth: 2},
  mascot: {width: 102, height: 102},
  mascotCompact: {width: 54, height: 54},
  label: {fontSize: tokens.fontSize.md, color: '#D9F7FF', fontWeight: '700', textAlign: 'center'},
});
