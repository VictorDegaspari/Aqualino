import React, {useEffect, useRef} from 'react';
import {Animated, Easing, Image, StyleSheet, Text, View} from 'react-native';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';

const background = require('../../assets/challenge/static/ocean-background.webp');
const loadingMascot = require('../../assets/mascot/static/loading_aqualino.webp');

export function AppLoadingScreen(): React.JSX.Element {
  const openingCircle = useRef(new Animated.Value(0.01)).current;
  const mascotScale = useRef(new Animated.Value(0.94)).current;
  const mascotOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const reveal = Animated.timing(openingCircle, {
      toValue: 4.6,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    const float = Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(mascotScale, {toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true}),
        Animated.timing(mascotOffset, {toValue: -8, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
      Animated.parallel([
        Animated.timing(mascotScale, {toValue: 0.97, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
        Animated.timing(mascotOffset, {toValue: 0, duration: 800, easing: Easing.inOut(Easing.quad), useNativeDriver: true}),
      ]),
    ]));

    reveal.start();
    float.start();
    return () => {
      reveal.stop();
      float.stop();
    };
  }, [mascotOffset, mascotScale, openingCircle]);

  return (
    <View accessibilityLabel="Carregando Aqualino" style={styles.page}>
      <Image pointerEvents="none" source={background} resizeMode="cover" style={styles.background} />
      <View pointerEvents="none" style={styles.overlay} />
      <Animated.View pointerEvents="none" style={[styles.openingCircle, {transform: [{scale: openingCircle}]}]} />
      <View style={styles.content}>
        <Animated.Image
          source={loadingMascot}
          resizeMode="contain"
          style={[styles.mascot, {transform: [{translateY: mascotOffset}, {scale: mascotScale}]}]}
        />
        <Text style={styles.label}>Preparando seu oceano</Text>
        <View style={styles.waveTrack}><Animated.View style={[styles.wave, {transform: [{scaleX: openingCircle.interpolate({inputRange: [0, 4.6], outputRange: [0.08, 1]})}]}]} /></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: challengeTheme.colors.backgroundDeep},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.7},
  overlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.6)'},
  openingCircle: {position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(11, 225, 236, 0.2)', borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.45)'},
  content: {alignItems: 'center'},
  mascot: {width: 230, height: 230, shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.72, shadowRadius: 23, shadowOffset: {width: 0, height: 7}},
  label: {marginTop: 20, color: challengeTheme.colors.text, fontSize: 17, lineHeight: 23, fontWeight: '800'},
  waveTrack: {width: 130, height: 5, marginTop: 15, overflow: 'hidden', borderRadius: 3, backgroundColor: 'rgba(141, 171, 200, 0.28)'},
  wave: {width: '100%', height: '100%', borderRadius: 3, backgroundColor: challengeTheme.colors.cyanStrong},
});
