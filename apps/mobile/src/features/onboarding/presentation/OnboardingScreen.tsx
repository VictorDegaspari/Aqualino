import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {tokens} from '@aqualino/design-tokens';
import {Screen} from '../../../shared/components/Screen';
import {FormField} from '../../../shared/components/FormField';
import {PrimaryButton} from '../../../shared/components/PrimaryButton';
import {AppError} from '../../../shared/errors/AppError';
import {useSessionStore} from '../../auth/application/sessionStore';
import {authRepository} from '../../auth/data/authRepository';
import {hydrationRemoteRepository} from '../../hydration/data/hydrationRemoteRepository';

const VOLUMES = [200, 300, 500, 750];

export function OnboardingScreen(): React.JSX.Element {
  const user = useSessionStore(state => state.user);
  const refreshUser = useSessionStore(state => state.refreshUser);
  const [goal, setGoal] = useState('2000');
  const [volumes, setVolumes] = useState([200, 300, 500]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const toggleVolume = (volume: number) => {
    setVolumes(current => current.includes(volume) ? current.filter(value => value !== volume) : [...current, volume]);
  };

  const complete = async () => {
    setLoading(true);
    setError(undefined);
    try {
      await hydrationRemoteRepository.updateGoal(Number(goal));
      await authRepository.updateProfile({
        timezone: user?.profile.timezone ?? 'America/Sao_Paulo',
        favorite_volumes_ml: volumes,
        onboarding_completed: true,
      });
      await refreshUser();
    } catch (cause) {
      setError(cause instanceof AppError ? cause.message : 'Não foi possível salvar suas preferências.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>Prepare seu Aqualino</Text>
      <Text style={styles.subtitle}>Você pode mudar tudo depois. A meta é uma ferramenta de hábito, não orientação médica.</Text>
      <FormField label="Meta diária (ml)" value={goal} onChangeText={setGoal} keyboardType="number-pad" />
      <Text style={styles.label}>Volumes favoritos</Text>
      <View style={styles.chips}>
        {VOLUMES.map(volume => (
          <Pressable key={volume} accessibilityRole="checkbox" accessibilityState={{checked: volumes.includes(volume)}}
            onPress={() => toggleVolume(volume)} style={[styles.chip, volumes.includes(volume) && styles.chipSelected]}>
            <Text style={volumes.includes(volume) ? styles.chipTextSelected : styles.chipText}>{volume} ml</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.timezone}>Fuso: {user?.profile.timezone ?? 'America/Sao_Paulo'}</Text>
      <Text style={styles.notice}>Se você possui restrição hídrica, siga a orientação do seu profissional de saúde.</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <PrimaryButton label="Concluir e começar" onPress={complete} loading={loading}
        disabled={Number(goal) < 500 || Number(goal) > 10000 || volumes.length === 0} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {fontSize: tokens.fontSize.xl, fontWeight: '800', color: tokens.color.text, marginTop: tokens.spacing.xl},
  subtitle: {fontSize: tokens.fontSize.md, color: tokens.color.textMuted, lineHeight: 24},
  label: {fontSize: tokens.fontSize.md, color: tokens.color.text, fontWeight: '700'},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: tokens.spacing.sm},
  chip: {minHeight: 48, minWidth: 88, padding: 12, borderWidth: 1, borderColor: tokens.color.border,
    borderRadius: tokens.radius.pill, alignItems: 'center', justifyContent: 'center'},
  chipSelected: {backgroundColor: tokens.color.primary, borderColor: tokens.color.primary},
  chipText: {color: tokens.color.text},
  chipTextSelected: {color: '#FFFFFF', fontWeight: '700'},
  timezone: {color: tokens.color.textMuted},
  notice: {backgroundColor: '#E8F6F7', color: tokens.color.text, padding: tokens.spacing.md, borderRadius: tokens.radius.md},
  error: {color: tokens.color.danger},
});
