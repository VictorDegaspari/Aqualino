import React from 'react';
import {StyleSheet, View} from 'react-native';

export function AppModalLayer({children}: React.PropsWithChildren): React.JSX.Element {
  return <View style={[StyleSheet.absoluteFill, styles.layer]}>{children}</View>;
}

const styles = StyleSheet.create({layer: {zIndex: 100, elevation: 100}});
