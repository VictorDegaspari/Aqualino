import React from 'react';
import {StyleSheet} from 'react-native';
import {RaisedButton, type ButtonTone} from '../../../shared/components/RaisedButton';

export function GroupButton({label, onPress, disabled, busy, secondary, tone = 'aqua'}: {
  label: string; onPress: () => void; disabled?: boolean; busy?: boolean; secondary?: boolean; tone?: ButtonTone;
}): React.JSX.Element {
  return <RaisedButton
    label={label}
    onPress={onPress}
    disabled={disabled}
    loading={busy}
    variant={secondary ? 'outlined' : 'filled'}
    tone={tone}
    style={styles.button}
  />;
}
const styles = StyleSheet.create({button: {width: '100%'}});
