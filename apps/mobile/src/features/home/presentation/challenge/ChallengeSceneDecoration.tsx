import React, {useMemo} from 'react';
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  SensorType,
  useAnimatedSensor,
  useAnimatedStyle,
  useReducedMotion,
  type SharedValue,
  type ValueRotation,
} from 'react-native-reanimated';
import {ChallengeAsset, type ChallengeAssetName} from './ChallengeAsset';

export function ChallengeSceneDecoration(): React.JSX.Element {
  const {height} = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const rotation = useAnimatedSensor(SensorType.ROTATION, {
    interval: 50,
    adjustToInterfaceOrientation: true,
  });
  const imageStyles = useMemo(() => createImageStyles(height), [height]);

  return (
    <View pointerEvents="none" style={styles.scene}>
      <ParallaxLayer asset="coralLeftBack" containerStyle={styles.leftBack} depth={0.36} imageStyle={imageStyles.strip} reduceMotion={reduceMotion} sensor={rotation.sensor} />
      <ParallaxLayer asset="coralRightBack" containerStyle={styles.rightBack} depth={0.32} imageStyle={imageStyles.strip} reduceMotion={reduceMotion} sensor={rotation.sensor} />
      <ParallaxLayer asset="clownfish" containerStyle={styles.fish} depth={0.5} imageStyle={imageStyles.fish} reduceMotion={reduceMotion} sensor={rotation.sensor} />
      <ParallaxLayer asset="coralLeftMid" containerStyle={styles.leftMid} depth={0.78} imageStyle={imageStyles.strip} reduceMotion={reduceMotion} sensor={rotation.sensor} />
      <ParallaxLayer asset="coralRightMid" containerStyle={styles.rightMid} depth={0.72} imageStyle={imageStyles.strip} reduceMotion={reduceMotion} sensor={rotation.sensor} />
      <ParallaxLayer asset="coralLeftFront" containerStyle={styles.leftFront} depth={1.18} imageStyle={imageStyles.strip} reduceMotion={reduceMotion} sensor={rotation.sensor} />
      <ParallaxLayer asset="coralRightFront" containerStyle={styles.rightFront} depth={1.12} imageStyle={imageStyles.strip} reduceMotion={reduceMotion} sensor={rotation.sensor} />
    </View>
  );
}

interface ParallaxLayerProps {
  asset: ChallengeAssetName;
  containerStyle: StyleProp<ViewStyle>;
  depth: number;
  imageStyle: ImageStyle;
  reduceMotion: boolean;
  sensor: SharedValue<ValueRotation>;
}

function ParallaxLayer({asset, containerStyle, depth, imageStyle, reduceMotion, sensor}: ParallaxLayerProps): React.JSX.Element {
  const animatedStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {transform: [{translateX: 0}, {translateY: 0}]};
    }

    const horizontalLimit = 10 * depth;
    const verticalLimit = 6 * depth;
    return {
      transform: [
        {translateX: clamp(sensor.value.roll * 11 * depth, -horizontalLimit, horizontalLimit)},
        {translateY: clamp(sensor.value.pitch * 6 * depth, -verticalLimit, verticalLimit)},
      ],
    };
  });

  return (
    <Animated.View style={[containerStyle, animatedStyle]}>
      <ChallengeAsset name={asset} resizeMode="stretch" style={imageStyle} />
    </Animated.View>
  );
}

function createImageStyles(screenHeight: number): {strip: ImageStyle; fish: ImageStyle} {
  const decorationTop = Math.max(150, Math.min(190, screenHeight * 0.215));
  const decorationHeight = Math.max(560, screenHeight - decorationTop + 90);

  return {
    strip: {width: 145, height: decorationHeight},
    fish: {width: 74, height: 76},
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  'worklet';
  return Math.min(maximum, Math.max(minimum, value));
}

const styles = StyleSheet.create({
  scene: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden'},
  leftBack: {position: 'absolute', left: -45, top: '21.5%'},
  leftMid: {position: 'absolute', left: -30, top: '21.5%'},
  leftFront: {position: 'absolute', left: -60, top: '21.5%'},
  rightBack: {position: 'absolute', right: -56, top: '21.5%'},
  rightMid: {position: 'absolute', right: -30, top: '21.5%'},
  rightFront: {position: 'absolute', right: -75, top: '21.5%'},
  fish: {position: 'absolute', left: 2, top: '19%'},
});
