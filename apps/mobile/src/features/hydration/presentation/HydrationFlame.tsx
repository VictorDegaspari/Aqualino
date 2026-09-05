import React from 'react';
import {View} from 'react-native';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';

interface Props {
  totalMl: number;
  size: number;
}

export function HydrationFlame({totalMl, size}: Props): React.JSX.Element {
  const lit = totalMl > 0;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={lit ? 'Fogo aceso: você já bebeu água hoje' : 'Fogo apagado: você ainda não bebeu água hoje'}>
      <AqualinoIcon name="flame" size={size} color={lit ? undefined : '#607485'} />
    </View>
  );
}
