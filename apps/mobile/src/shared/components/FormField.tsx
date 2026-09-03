import React from 'react';
import {StyleSheet, Text, TextInput, type TextInputProps, View} from 'react-native';
import {tokens} from '@aqualino/design-tokens';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function FormField({label, error, ...props}: Props): React.JSX.Element {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={tokens.color.textMuted}
        style={[styles.input, error ? styles.inputError : null]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {gap: tokens.spacing.xs},
  label: {fontSize: tokens.fontSize.sm, color: tokens.color.text, fontWeight: '600'},
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: tokens.color.border,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.surface,
    color: tokens.color.text,
    paddingHorizontal: tokens.spacing.md,
    fontSize: tokens.fontSize.md,
  },
  inputError: {borderColor: tokens.color.danger},
  error: {color: tokens.color.danger, fontSize: tokens.fontSize.sm},
});

