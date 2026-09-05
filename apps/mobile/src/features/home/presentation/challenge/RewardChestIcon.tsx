import React from 'react';
import Svg, {Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';

export function RewardChestIcon({size = 88, opened = false}: {size?: number; opened?: boolean}): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={opened ? 'Baú de recompensa aberto' : 'Baú de recompensa'}>
      <Defs>
        <LinearGradient id="chestWood" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#CB7940" /><Stop offset="1" stopColor="#743C31" /></LinearGradient>
        <LinearGradient id="chestGold" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFF1A4" /><Stop offset="1" stopColor="#E9A62B" /></LinearGradient>
      </Defs>
      {opened ? <Path d="M27 42 18 17 39 31 50 8 61 31 82 17 73 42Z" fill="#71F6EA" opacity={0.8} /> : null}
      <Path d={opened ? 'M13 37 17 19Q50 8 83 19L87 37Z' : 'M13 49V36Q13 20 30 20H70Q87 20 87 36V49Z'} fill="url(#chestWood)" stroke="#FFE292" strokeWidth="4" strokeLinejoin="round" />
      <Path d="M13 49H87V77Q87 84 80 84H20Q13 84 13 77Z" fill="url(#chestWood)" stroke="#FFE292" strokeWidth="4" strokeLinejoin="round" />
      <Path d="M26 51V82M74 51V82" stroke="url(#chestGold)" strokeWidth="9" />
      <Path d="M14 50H86" stroke="#FFF1A4" strokeWidth="6" />
      <Rect x="42" y="45" width="16" height="23" rx="5" fill="url(#chestGold)" stroke="#8B511F" strokeWidth="2" />
      <Path d="M50 52V60" stroke="#59351D" strokeWidth="4" strokeLinecap="round" />
      <Path d="M5 33V23M0 28H10M93 57V45M87 51H99" stroke="#ACFFF5" strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}
