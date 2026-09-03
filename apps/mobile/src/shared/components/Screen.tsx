import React from 'react';
import {ScrollView, StyleSheet, type ScrollViewProps} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {tokens} from '@aqualino/design-tokens';

export function Screen({children, ...props}: React.PropsWithChildren<ScrollViewProps>): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" {...props}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: tokens.color.background},
  content: {flexGrow: 1, padding: tokens.spacing.lg, gap: tokens.spacing.md},
});

