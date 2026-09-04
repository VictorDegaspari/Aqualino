import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface Props {
  size: number;
  color: string;
}

export function BellIcon({size, color}: Props): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 9.5a6 6 0 0 0-12 0c0 7-3 7-3 8.5h18c0-1.5-3-1.5-3-8.5Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9.5 21h5" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
