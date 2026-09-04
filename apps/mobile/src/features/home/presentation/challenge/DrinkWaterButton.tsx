import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {haptics} from '../../../../shared/device/haptics';
import {ChallengeAsset} from './ChallengeAsset';

interface Props {
  onPress: () => void;
}

export function DrinkWaterButton({onPress}: Props): React.JSX.Element {
  const handlePress = () => {
    haptics.lightImpact();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Bebi água"
      onPress={handlePress}
      style={({pressed}) => [styles.button, pressed && styles.pressed]}>
      <ChallengeAsset name="drinkButton" resizeMode="stretch" style={styles.background} />
      <View style={styles.content}>
        <ChallengeAsset name="addWater" style={styles.icon} />
        <Text style={styles.label}>Bebi água</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center', width: '70%', minWidth: 238, maxWidth: 270, height: 70, justifyContent: 'center',
    shadowColor: '#00EAF4', shadowOpacity: 0.75, shadowRadius: 17,
    shadowOffset: {width: 0, height: 0}, elevation: 12,
  },
  pressed: {opacity: 0.88, transform: [{scale: 0.985}, {translateY: 2}]},
  background: {position: 'absolute', width: '100%', height: '100%'},
  content: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 4},
  icon: {width: 44, height: 44},
  label: {fontSize: 26, lineHeight: 32, fontWeight: '900', color: '#FFFFFF', textShadowColor: '#07869A', textShadowRadius: 5},
});
