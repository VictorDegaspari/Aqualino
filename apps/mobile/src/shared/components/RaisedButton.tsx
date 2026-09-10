import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type ViewStyle} from 'react-native';

export type ButtonTone = 'ocean' | 'aqua' | 'success' | 'gold' | 'danger' | 'neutral';

const tones = {
  ocean: {fill: '#009EBB', depth: '#007C98', text: '#FFFFFF', outline: '#91C8D1'},
  aqua: {fill: '#91C8D1', depth: '#477B87', text: '#071820', outline: '#91C8D1'},
  success: {fill: '#25806C', depth: '#185B4E', text: '#FFFFFF', outline: '#8FDBC0'},
  gold: {fill: '#FFBF23', depth: '#A16B08', text: '#3C2806', outline: '#FFCF66'},
  danger: {fill: '#FF94A4', depth: '#9E485A', text: '#411820', outline: '#FF94A4'},
  neutral: {fill: '#244957', depth: '#122F3A', text: '#F1F7F6', outline: '#A9C0C5'},
} as const;

export interface RaisedButtonProps extends Omit<PressableProps, 'children' | 'style' | 'onPress'> {
  label: string;
  onPress: () => void;
  loading?: boolean;
  subtitle?: string;
  variant?: 'filled' | 'outlined';
  tone?: ButtonTone;
  size?: 'compact' | 'regular' | 'large';
  icon?: React.ReactNode;
  /** Show only the icon; label remains available to screen readers. */
  iconOnly?: boolean;
  /** Layout of the button (width, flex, margins); appearance comes from tone/variant. */
  style?: StyleProp<ViewStyle>;
}

/** The face sinks into the bottom edge without exposing a shadow above it or shifting layout. */
export function RaisedButton({label, onPress, loading = false, disabled = false, accessibilityLabel, accessibilityState,
  subtitle, testID, style, variant = 'filled', tone = 'ocean', size = 'regular', icon, iconOnly = false, ...props}: RaisedButtonProps): React.JSX.Element {
  const unavailable = disabled || loading;
  const palette = tones[tone];
  const outlined = variant === 'outlined';
  const backgroundColor = outlined ? 'transparent' : palette.fill;
  const labelColor = outlined ? palette.outline : palette.text;
  return <Pressable {...props} testID={testID} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label}
    accessibilityState={{...accessibilityState, disabled: unavailable, busy: loading || accessibilityState?.busy}}
    disabled={unavailable} onPress={onPress} style={[styles.base, style, unavailable && styles.disabled]}>
    {({pressed}) => <>
      <View pointerEvents="none" style={[styles.depth, {borderColor: outlined ? palette.outline : palette.depth}, pressed && !unavailable && styles.hidden]} />
      <View testID={testID ? `${testID}-face` : undefined} style={[styles.face, sizes[size], iconOnly && styles.iconOnly,
        {backgroundColor, borderColor: outlined ? palette.outline : palette.fill},
        pressed && !unavailable && styles.pressed]}>
        {loading ? <ActivityIndicator testID="button-loading-spinner" size="small" color={labelColor} accessible={false} style={styles.spinner} /> : icon}
        {!iconOnly ? <View style={styles.caption}>
          <Text style={[styles.label, size === 'compact' && styles.compactLabel, size === 'large' && styles.largeLabel,
            {color: labelColor}]}>{label}</Text>
          {subtitle ? <Text style={[styles.subtitle, {color: labelColor}]}>{subtitle}</Text> : null}
        </View> : null}
      </View>
    </>}
  </Pressable>;
}

const styles = StyleSheet.create({
  base: {borderRadius: 16, paddingBottom: 4, maxWidth: '100%', flexShrink: 1},
  depth: {position: 'absolute', left: 0, right: 0, bottom: 0, height: 20, borderLeftWidth: 2, borderRightWidth: 2, borderBottomWidth: 4, borderBottomLeftRadius: 16, borderBottomRightRadius: 16},
  face: {borderRadius: 16, borderWidth: 2, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center'},
  iconOnly: {paddingHorizontal: 8},
  spinner: {width: 24, height: 24},
  caption: {flexShrink: 1, gap: 4}, subtitle: {fontSize: 12, lineHeight: 18, textAlign: 'center'},
  label: {fontSize: 16, fontWeight: '900', textAlign: 'center', flexShrink: 1},
  compactLabel: {fontSize: 14}, largeLabel: {fontSize: 20},
  pressed: {transform: [{translateY: 4}]}, hidden: {opacity: 0}, disabled: {opacity: 0.45},
});
const sizes = StyleSheet.create({
  compact: {minHeight: 40, paddingHorizontal: 12, paddingVertical: 8},
  regular: {minHeight: 48, paddingHorizontal: 16, paddingVertical: 12},
  large: {minHeight: 60, paddingHorizontal: 20, paddingVertical: 14},
});
