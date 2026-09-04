import React from 'react';
import {Image, type ImageStyle, type StyleProp} from 'react-native';

const challengeAssets = {
  background: require('../../../../assets/challenge/static/ocean-background.webp'),
  coralLeftBack: require('../../../../assets/challenge/parallax/coral-left-back.webp'),
  coralLeftMid: require('../../../../assets/challenge/parallax/coral-left-mid.webp'),
  coralLeftFront: require('../../../../assets/challenge/parallax/coral-left-front.webp'),
  coralRightBack: require('../../../../assets/challenge/parallax/coral-right-back.webp'),
  coralRightMid: require('../../../../assets/challenge/parallax/coral-right-mid.webp'),
  coralRightFront: require('../../../../assets/challenge/parallax/coral-right-front.webp'),
  clownfish: require('../../../../assets/challenge/parallax/clownfish.webp'),
  timelineStream: require('../../../../assets/challenge/static/timeline-stream.png'),
  dayPlatform: require('../../../../assets/challenge/static/day-platform.png'),
  dayCompleted: require('../../../../assets/challenge/static/day-completed.png'),
  dayLocked: require('../../../../assets/challenge/static/day-locked.png'),
  dayMissed: require('../../../../assets/challenge/static/day-missed.png'),
  dayEmpty: require('../../../../assets/challenge/static/day-empty.png'),
  dayProgress: require('../../../../assets/challenge/static/day-progress.png'),
  currentDrop: require('../../../../assets/challenge/static/water-drop-current.png'),
  trophySilver: require('../../../../assets/challenge/static/trophy-silver.png'),
  drinkButton: require('../../../../assets/challenge/static/drink-water-button-bg.png'),
  addWater: require('../../../../assets/challenge/static/add-water.png'),
  rankGold: require('../../../../assets/challenge/static/rank-gold.png'),
  rankSilver: require('../../../../assets/challenge/static/rank-silver.png'),
  rankBronze: require('../../../../assets/challenge/static/rank-bronze.png'),
} as const;

export type ChallengeAssetName = keyof typeof challengeAssets;

interface Props {
  name: ChallengeAssetName;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
}

export function ChallengeAsset({name, style, resizeMode = 'contain'}: Props): React.JSX.Element {
  return <Image source={challengeAssets[name]} resizeMode={resizeMode} style={style} />;
}
