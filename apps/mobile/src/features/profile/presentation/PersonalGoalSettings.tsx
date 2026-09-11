import React, {useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, TextInput, View} from 'react-native';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {useTranslation} from '../../../shared/i18n/useTranslation';
import {haptics} from '../../../shared/device/haptics';
import {hydrationRemoteRepository} from '../../hydration/data/hydrationRemoteRepository';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

interface Props {
  currentGoal?: number;
  loadError?: boolean;
  disabled: boolean;
  onSavingChange: (saving: boolean) => void;
  onSaved: () => void;
}

export function PersonalGoalSettings({currentGoal, loadError = false, disabled, onSavingChange, onSaved}: Props): React.JSX.Element {
  const {locale, t} = useTranslation();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [savedGoal, setSavedGoal] = useState(currentGoal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const pending = useRef(false);
  const latestValue = useRef('');
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false;};
  }, []);
  useEffect(() => {setSavedGoal(currentGoal);}, [currentGoal]);
  const validGoal = (text: string) => /^\d+$/.test(text) && Number(text) >= 500 && Number(text) <= 10000;
  const unavailable = disabled || saving;
  const save = async () => {
    const amount = Number(latestValue.current);
    if (pending.current || disabled || !validGoal(latestValue.current) || amount === savedGoal) return;
    pending.current = true;
    setSaving(true);
    onSavingChange(true);
    setError(false);
    try {
      await hydrationRemoteRepository.updateGoal(amount);
      if (!mounted.current) return;
      setSavedGoal(amount);
      setEditing(false);
      setSaved(true);
      haptics.success();
      onSaved();
    } catch {
      if (mounted.current) setError(true);
    } finally {
      pending.current = false;
      if (mounted.current) {
        setSaving(false);
        onSavingChange(false);
      }
    }
  };

  return (
    <View style={styles.panel}>
      <Pressable testID="profile-goal" accessibilityRole="button" accessibilityState={{expanded: editing, disabled: unavailable || savedGoal === undefined}}
        disabled={unavailable || savedGoal === undefined} onPress={() => {
          latestValue.current = String(savedGoal);
          setValue(latestValue.current);
          setError(false);
          setSaved(false);
          setEditing(open => !open);
        }}>
        <Text style={styles.title}>{t('Meta pessoal', 'Personal goal', 'Meta personal')}</Text>
        <Text style={styles.description}>{savedGoal === undefined
          ? loadError ? t('Não foi possível carregar a meta.', 'Could not load your goal.', 'No se pudo cargar la meta.') : t('Carregando meta…', 'Loading goal…', 'Cargando meta…')
          : t(`${savedGoal.toLocaleString(locale)} ml por dia`, `${savedGoal.toLocaleString(locale)} ml per day`, `${savedGoal.toLocaleString(locale)} ml al día`)}</Text>
      </Pressable>
      {savedGoal === undefined && loadError ? <RaisedButton label={t('Tentar novamente', 'Try again', 'Intentar de nuevo')}
        variant="outlined" tone="neutral" disabled={unavailable} onPress={onSaved} /> : null}
      {editing ? <View style={styles.editor}>
        <View style={styles.inputRow}>
          <TextInput testID="profile-goal-input" accessibilityLabel={t('Meta pessoal em mililitros', 'Personal goal in milliliters', 'Meta personal en mililitros')}
            value={value} onChangeText={text => {latestValue.current = text; setValue(text); setError(false);}}
            keyboardType="number-pad" maxLength={5} editable={!unavailable} selectTextOnFocus
            returnKeyType="done" onSubmitEditing={event => {latestValue.current = event.nativeEvent.text; save();}}
            style={styles.input} />
          <Text style={styles.description}>ml</Text>
        </View>
        <Text style={styles.description}>{t('De 500 a 10.000 ml por dia.', 'From 500 to 10,000 ml per day.', 'De 500 a 10.000 ml al día.')}</Text>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{t('Não foi possível salvar a meta. Tente novamente.', 'Could not save your goal. Try again.', 'No se pudo guardar la meta. Inténtalo de nuevo.')}</Text> : null}
        <RaisedButton testID="profile-goal-save" label={t('Salvar meta', 'Save goal', 'Guardar meta')} tone="aqua"
          disabled={unavailable || !validGoal(value) || Number(value) === savedGoal} loading={saving} onPress={() => {save();}} />
        <RaisedButton label={t('Cancelar', 'Cancel', 'Cancelar')} variant="outlined" tone="neutral" disabled={unavailable}
          onPress={() => {setEditing(false); setError(false);}} />
      </View> : null}
      {saved ? <Text accessibilityLiveRegion="polite" style={styles.description}>{t('Meta salva.', 'Goal saved.', 'Meta guardada.')}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {padding: 18, gap: 8, borderRadius: challengeTheme.radius.panel, backgroundColor: challengeTheme.colors.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong},
  title: {fontSize: 20, lineHeight: 26, fontWeight: '900', color: challengeTheme.colors.text},
  description: {fontSize: 13, lineHeight: 19, color: challengeTheme.colors.muted},
  editor: {gap: 12, paddingTop: 8},
  inputRow: {flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panelSoft},
  input: {flex: 1, minHeight: 52, fontSize: 21, fontWeight: '800', color: challengeTheme.colors.text, paddingVertical: 10},
  error: {fontSize: 13, lineHeight: 19, color: challengeTheme.colors.danger},
});
