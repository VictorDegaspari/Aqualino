import React from 'react';
import {StyleSheet, View} from 'react-native';
import Svg, {G, Image, Path, Rect, Text} from 'react-native-svg';
import type {AppLocale} from '../../../shared/i18n/appLocale';

// Match the large Android widget's 434 × 236 layout and three-day streak palette.
export function WidgetPreview({locale}: {locale: AppLocale}): React.JSX.Element {
  const english = locale === 'en-US';
  const spanish = locale === 'es-ES';
  const days = english ? ['M', 'T', 'W', 'T', 'F'] : spanish ? ['L', 'M', 'X', 'J', 'V'] : ['S', 'T', 'Q', 'Q', 'S'];

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={english ? 'Aqualino widget preview: 3 days of streak' : spanish ? 'Vista previa del widget Aqualino: racha de 3 días' : 'Prévia do widget Aqualino: sequência de 3 dias'}
      style={styles.preview}>
      <Svg width="100%" height="100%" viewBox="0 0 434 236" accessible={false}>
        <Rect width={434} height={236} rx={32} fill="#7C24B8" />
        <G transform="translate(20 28) scale(0.84375)">
          <Path fill="#FFFFFF" d="M16,2.4C13.1,7.1 6.2,14.3 6.2,20.4C6.2,25.8 10.6,30.2 16,30.2C21.4,30.2 25.8,25.8 25.8,20.4C25.8,14.3 18.9,7.1 16,2.4ZM16,26.4C12.7,26.4 10,23.7 10,20.4C10,19.7 10.2,18.9 10.5,18.1C11.2,21.4 13.6,23.7 17.1,24.1C18.2,24.2 19.2,24.1 20.2,23.7C19.1,25.4 17.6,26.4 16,26.4Z" />
        </G>
        <Text x={54} y={53} fontSize={28} fontWeight="bold" fill="#FFF7FF">
          {english ? '3 days' : spanish ? '3 días' : '3 dias'}
        </Text>
        <Text x={20} y={86} fontSize={16} fill="#F8DFFF">
          {english ? 'Three days strong!' : spanish ? '¡Tres días de fuerza!' : 'Três dias de força!'}
        </Text>
        {days.map((day, index) => (
          <Text key={index} x={38 + index * 47} y={166} fontSize={12} fontWeight="bold" textAnchor="middle" fill="#FFF7FF">{day}</Text>
        ))}
        <Rect x={20} y={172} width={36} height={36} rx={18} fill="#4A126E" />
        <Rect x={67} y={172} width={130} height={36} rx={18} fill="#FFD24A" />
        {[85, 132, 179].map(x => (
          <Text key={x} x={x} y={198} fontSize={22} fontWeight="bold" textAnchor="middle" fill="#FFFFFF">✓</Text>
        ))}
        <Rect x={208} y={172} width={36} height={36} rx={18} fill="#4A126E" />
        <Image href={require('../../../assets/mascot/static/aqualino_strong.png')} x={248} y={65} width={170} height={143} preserveAspectRatio="xMidYMid meet" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: {width: '100%', maxWidth: 434, aspectRatio: 434 / 236, alignSelf: 'center'},
});
