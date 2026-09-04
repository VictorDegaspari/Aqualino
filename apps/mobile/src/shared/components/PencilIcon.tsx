import React from 'react';
import Svg, {Path} from 'react-native-svg';

interface Props {
  size: number;
  color: string;
}

export function PencilIcon({size, color}: Props): React.JSX.Element {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13.6 5.2 18.8 10.4M4 20l4.25-1.02L19.4 7.83a1.84 1.84 0 0 0 0-2.6l-.63-.63a1.84 1.84 0 0 0-2.6 0L5.02 15.75 4 20Z"
        stroke={color}
        strokeWidth={2.15}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
