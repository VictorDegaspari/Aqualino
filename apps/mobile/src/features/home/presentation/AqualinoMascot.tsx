import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {MascotCondition} from '@aqualino/contracts';
import {tokens} from '@aqualino/design-tokens';

const labels: Record<MascotCondition, string> = {
  empty: 'Aqualino está pronto para começar',
  happy: 'Aqualino está feliz',
  angry: 'Aqualino quer lembrar você com carinho',
  boiling: 'Aqualino está fervendo de saudade',
  skeleton: 'Aqualino sentiu sua falta',
};

const faces: Record<MascotCondition, string> = {
  empty: '💧', happy: '💧', angry: '💢', boiling: '♨️', skeleton: '🩻',
};

export function AqualinoMascot({condition}: {condition: MascotCondition}): React.JSX.Element {
  return (
    <View style={styles.container} accessibilityLabel={labels[condition]}>
      <Text style={styles.mascot} importantForAccessibility="no">{faces[condition]}</Text>
      <Text style={styles.label}>{labels[condition]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', gap: tokens.spacing.sm},
  mascot: {fontSize: 88},
  label: {fontSize: tokens.fontSize.md, color: tokens.color.text, fontWeight: '600', textAlign: 'center'},
});

