import React from 'react';
import Svg, {Circle, Path} from 'react-native-svg';

export function SettingsIcon({size, color}: {size: number; color: string}): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
      <Path d="m9 3-.5 2.5-2 1.2L4 6l-2 3.5 2 1.8v1.4l-2 1.8L4 18l2.5-.7 2 1.2L9 21h6l.5-2.5 2-1.2 2.5.7 2-3.5-2-1.8v-1.4l2-1.8L20 6l-2.5.7-2-1.2L15 3Z" stroke={color} strokeWidth={1.7} strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3.5} stroke={color} strokeWidth={1.7} />
    </Svg>
  );
}
