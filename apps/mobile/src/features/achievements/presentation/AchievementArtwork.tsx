import React from 'react';
import {Image, StyleSheet, View} from 'react-native';
import Svg, {Text as SvgText} from 'react-native-svg';
import type {AchievementCode} from '@aqualino/contracts';
import {achievementImages} from '../../../assets/achievements/achievementImages';

const palettes = {
  aqua: {main: '#27CFE0', shade: '#009EBB', light: '#D9F9FA', ink: '#07576F'},
  green: {main: '#77D94C', shade: '#39A842', light: '#E6F8CE', ink: '#276632'},
  blue: {main: '#53BAFF', shade: '#2786DD', light: '#DBF1FF', ink: '#21548E'},
  purple: {main: '#B48AFF', shade: '#8456CE', light: '#EEE3FF', ink: '#594092'},
  gold: {main: '#FFCF48', shade: '#E99C21', light: '#FFF1C5', ink: '#865019'},
  coral: {main: '#FF9278', shade: '#EA665C', light: '#FFE6DA', ink: '#923E43'},
};

export function achievementPalette(code: AchievementCode) {
  if (code === 'level_100' || code === 'streak_30' || code === 'first_goal') return palettes.gold;
  if (code === 'level_50' || code === 'streak_14' || code === 'goals_30') return palettes.purple;
  if (code === 'level_5' || code === 'streak_3') return palettes.green;
  if (code === 'first_reminder' || code === 'team_player') return palettes.coral;
  if (code === 'level_10' || code === 'streak_7') return palettes.blue;
  return palettes.aqua;
}

export function AchievementArtwork({code, target, size}: {code: AchievementCode; target: number; size: number}): React.JSX.Element {
  const palette = achievementPalette(code);
  return <View style={{width: size, height: size}}>
    <Image source={achievementImages[code]} resizeMode="contain" resizeMethod="resize" style={styles.image} />
    <Svg width={size} height={size} viewBox="0 0 120 120" accessible={false} style={StyleSheet.absoluteFill}>
      <SvgText x="60" y="116" textAnchor="middle" fontSize="29" fontWeight="900" fontFamily="sans-serif" stroke="white" strokeWidth="6" strokeLinejoin="round" fill="white">{target}</SvgText>
      <SvgText x="60" y="116" textAnchor="middle" fontSize="29" fontWeight="900" fontFamily="sans-serif" fill={palette.shade}>{target}</SvgText>
    </Svg>
  </View>;
}

const styles = StyleSheet.create({image: {width: '100%', height: '91%'}});
