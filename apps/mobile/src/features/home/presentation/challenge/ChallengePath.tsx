import React, {memo} from 'react';
import {StyleSheet} from 'react-native';
import Svg, {Defs, LinearGradient, Path, Stop} from 'react-native-svg';
import {dayNodes, timelineLayout} from './challengeTheme';

interface Props {
  scale: number;
}

const timelinePath = dayNodes.reduce((path, node, index) => {
  if (index === 0) {
    return `M ${node.x} ${node.y}`;
  }

  const previous = dayNodes[index - 1];
  const controlDistance = (node.y - previous.y) * 0.52;
  return `${path} C ${previous.x} ${previous.y + controlDistance}, ${node.x} ${node.y - controlDistance}, ${node.x} ${node.y}`;
}, '');

export const ChallengePath = memo(function ChallengePathView({scale}: Props): React.JSX.Element {
  return (
    <Svg
      pointerEvents="none"
      width={timelineLayout.canvasWidth * scale}
      height={timelineLayout.canvasHeight * scale}
      viewBox={`0 0 ${timelineLayout.canvasWidth} ${timelineLayout.canvasHeight}`}
      style={styles.path}>
      <Defs>
        <LinearGradient id="timelineStream" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#19DFFF" stopOpacity={0.98} />
          <Stop offset="0.5" stopColor="#087FD8" stopOpacity={0.94} />
          <Stop offset="1" stopColor="#0465B8" stopOpacity={0.72} />
        </LinearGradient>
      </Defs>
      <Path
        d={timelinePath}
        fill="none"
        stroke="#00B9FF"
        strokeOpacity={0.34}
        strokeWidth={26}
        strokeLinecap="round"
      />
      <Path
        d={timelinePath}
        fill="none"
        stroke="url(#timelineStream)"
        strokeWidth={11}
        strokeLinecap="round"
      />
      <Path
        d={timelinePath}
        fill="none"
        stroke="#C7FEFF"
        strokeOpacity={0.66}
        strokeWidth={2.2}
        strokeLinecap="round"
        transform="translate(-1.6 -1)"
      />
    </Svg>
  );
});

const styles = StyleSheet.create({
  path: {position: 'absolute', left: 0, top: 0},
});
