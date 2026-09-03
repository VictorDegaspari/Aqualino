import React from 'react';
import {Alert, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {tokens} from '@aqualino/design-tokens';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {Screen} from '../../../shared/components/Screen';
import {PrimaryButton} from '../../../shared/components/PrimaryButton';
import {useSessionStore} from '../../auth/application/sessionStore';
import {useHydrationHome} from './useHydrationHome';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickHydration'>;

export function QuickHydrationScreen({navigation, route}: Props): React.JSX.Element {
  const volumes = useSessionStore(state => state.user?.profile.favorite_volumes_ml ?? [200, 300, 500]);
  const {record, isRecording} = useHydrationHome();
  const source = route.params?.source === 'widget' ? 'widget' : 'shortcut';

  const submit = async (amount: number) => {
    try {
      await record({amountMl: amount, source});
      navigation.navigate('Home');
    } catch (error) {
      Alert.alert('Não foi possível registrar', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>Bebi água</Text>
      <Text style={styles.subtitle}>Escolha um volume. O toque é seguro contra duplicidade.</Text>
      <View style={styles.buttons}>
        {volumes.map(volume => (
          <PrimaryButton key={volume} label={`${volume} ml`} onPress={() => submit(volume)} loading={isRecording} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: tokens.fontSize.xl, fontWeight: '800', color: tokens.color.text},
  subtitle: {color: tokens.color.textMuted, lineHeight: 22},
  buttons: {gap: tokens.spacing.md, marginTop: tokens.spacing.md},
});
