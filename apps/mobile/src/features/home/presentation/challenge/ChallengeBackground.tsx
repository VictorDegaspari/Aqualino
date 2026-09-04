import React from 'react';
import {StyleSheet, View} from 'react-native';
import {ChallengeAsset} from './ChallengeAsset';

export function ChallengeBackground(): React.JSX.Element {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <ChallengeAsset name="background" resizeMode="cover" style={styles.background} />
    </View>
  );
}

const styles = StyleSheet.create({
  background: {position: 'absolute', width: '100%', height: '100%'},
});
