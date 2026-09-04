import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';
import {localeOptions, type AppLocale} from '../i18n/appLocale';

interface Props {
  value: AppLocale;
  onChange: (locale: AppLocale) => void;
}

export function LanguageSelector({value, onChange}: Props): React.JSX.Element {
  return (
    <View accessibilityRole="radiogroup" style={styles.options}>
      {localeOptions.map(option => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityLabel={`${option.label}, ${option.country}`}
            accessibilityState={{selected}}
            onPress={() => onChange(option.value)}
            style={({pressed}) => [styles.option, selected && styles.optionSelected, pressed && styles.optionPressed]}>
            <Text style={styles.flag}>{option.flag}</Text>
            <View style={styles.copy}>
              <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
              <Text style={[styles.country, selected && styles.countrySelected]}>{option.country}</Text>
            </View>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  options: {gap: 9},
  option: {
    minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13,
    borderRadius: 17, borderWidth: 1, borderColor: challengeTheme.colors.border,
    backgroundColor: challengeTheme.colors.panelSoft,
  },
  optionSelected: {borderColor: challengeTheme.colors.cyanStrong, backgroundColor: 'rgba(11, 225, 236, 0.14)'},
  optionPressed: {opacity: 0.82, transform: [{scale: 0.985}]},
  flag: {fontSize: 26, lineHeight: 31},
  copy: {flex: 1},
  label: {fontSize: 15, lineHeight: 20, fontWeight: '900', color: challengeTheme.colors.text},
  labelSelected: {color: challengeTheme.colors.cyanStrong},
  country: {fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
  countrySelected: {color: '#B5FBFF'},
  radio: {width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 2, borderColor: challengeTheme.colors.borderStrong},
  radioSelected: {borderColor: challengeTheme.colors.cyanStrong},
  radioDot: {width: 10, height: 10, borderRadius: 5, backgroundColor: challengeTheme.colors.cyanStrong},
});
