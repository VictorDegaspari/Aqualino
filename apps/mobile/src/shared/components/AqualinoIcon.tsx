import React from 'react';
import {Image, type ImageStyle, type StyleProp} from 'react-native';

const iconSources = {
  alert: require('../../assets/icons/static/alert.png'),
  check: require('../../assets/icons/static/check.png'),
  flame: require('../../assets/icons/static/flame.png'),
  group: require('../../assets/icons/static/group.png'),
  history: require('../../assets/icons/static/history.png'),
  home: require('../../assets/icons/static/home.png'),
  lock: require('../../assets/icons/static/lock.png'),
  logout: require('../../assets/icons/static/logout.png'),
  medalBronze: require('../../assets/icons/static/medal-bronze.png'),
  medalGold: require('../../assets/icons/static/medal-gold.png'),
  medalSilver: require('../../assets/icons/static/medal-silver.png'),
  person: require('../../assets/icons/static/person.png'),
  play: require('../../assets/icons/static/play.png'),
  plus: require('../../assets/icons/static/plus.png'),
  profile: require('../../assets/icons/static/profile.png'),
  star: require('../../assets/icons/static/star.png'),
  trophySilver: require('../../assets/icons/static/trophy-silver.png'),
  water: require('../../assets/icons/static/water.png'),
  waterPlus: require('../../assets/icons/static/water-plus.png'),
  waves: require('../../assets/icons/static/waves.png'),
} as const;

export type AqualinoIconName = keyof typeof iconSources;

interface Props {
  name: AqualinoIconName;
  size: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}

export function AqualinoIcon({name, size, color, style}: Props): React.JSX.Element {
  return (
    <Image
      source={iconSources[name]}
      resizeMode="contain"
      style={[{width: size, height: size, tintColor: color}, style]}
    />
  );
}
