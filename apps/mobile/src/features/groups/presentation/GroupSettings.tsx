import React, {useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {PrivateGroup} from '@aqualino/contracts';
import type {AppLocale} from '../../../shared/i18n/appLocale';
import {AppModal} from '../../../shared/components/AppModal';
import {AppSwitch} from '../../../shared/components/AppSwitch';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {groupsCopy} from './groupsCopy';

interface Props {
  group: PrivateGroup;
  locale: AppLocale;
  canEdit: boolean;
  busy: boolean;
  onPhotoReviewChange?: (enabled: boolean) => Promise<boolean>;
  onAutoRestartChange?: (enabled: boolean) => Promise<boolean>;
  onClose: () => void;
}

export function GroupSettings({group, locale, canEdit, busy, onPhotoReviewChange, onAutoRestartChange, onClose}: Props): React.JSX.Element {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const t = (pt: string, en: string, es: string) => locale === 'en-US' ? en : locale === 'es-ES' ? es : pt;
  const unavailable = busy || saving;
  const copy = groupsCopy[locale];
  const update = async (change: (enabled: boolean) => Promise<boolean>, enabled: boolean) => {
    setFailed(false);
    setSaving(true);
    try {
      const saved = await change(enabled);
      setFailed(!saved);
      return saved;
    } catch {
      setFailed(true);
      return false;
    } finally {
      setSaving(false);
    }
  };
  const options = [
    {
      id: 'group-auto-restart-toggle',
      label: t('Reinício automático', 'Automatic restart', 'Reinicio automático'),
      description: t('Quando ativado, uma nova rodada começa ao terminar a atual, com pelo menos 2 integrantes. Desativado, o responsável inicia a próxima manualmente. Rodadas já iniciadas ou agendadas continuam.', 'When enabled, a new round starts when the current one ends, with at least 2 members. Otherwise, the leader starts the next round manually. Active or scheduled rounds continue.', 'Si está activado, una nueva ronda empieza al terminar la actual, con al menos 2 miembros. Si no, el responsable inicia la próxima manualmente. Las rondas activas o programadas continúan.'),
      value: group.auto_restart ?? false,
      change: onAutoRestartChange,
    },
    {
      id: 'group-photo-review-toggle',
      label: t('Votação das marcações', 'Photo voting', 'Votación de registros'),
      description: t('Habilita a votação de fotos em grupos com 3 ou mais pessoas. Vale para novos envios; votações abertas mantêm o prazo de 12 horas.', 'Enables photo voting in groups with 3 or more people. Applies to new submissions; open votes keep their 12-hour deadline.', 'Activa la votación de fotos en grupos de 3 o más personas. Se aplica a nuevos envíos; las votaciones abiertas mantienen su plazo de 12 horas.'),
      value: group.photo_review_enabled ?? true,
      change: onPhotoReviewChange,
    },
  ];
  return (
    <AppModal onRequestClose={onClose} dismissible={!unavailable}>
      <SafeAreaView style={styles.overlay}>
        <Pressable accessible={false} onPress={onClose} disabled={unavailable} style={StyleSheet.absoluteFill} />
        <View testID="group-settings-panel" accessibilityViewIsModal style={styles.card}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>{t('Configurações do grupo', 'Group settings', 'Configuración del grupo')}</Text>
            {!canEdit ? <Text style={styles.description}>{t('Somente o responsável pode alterar estas configurações.', 'Only the leader can change these settings.', 'Solo el responsable puede cambiar esta configuración.')}</Text> : null}
            {options.map(option => (
              <View key={option.id} style={styles.option}>
                <View style={styles.row}>
                  <Text style={styles.label}>{option.label}</Text>
                  {canEdit && option.change ? <AppSwitch testID={option.id} accessibilityLabel={option.label} value={option.value} disabled={unavailable}
                    onValueChange={enabled => update(option.change!, enabled)} />
                    : <Text style={styles.description}>{option.value ? t('Ativado', 'Enabled', 'Activado') : t('Desativado', 'Disabled', 'Desactivado')}</Text>}
                </View>
                <Text style={styles.description}>{option.description}</Text>
              </View>
            ))}
            {failed ? <Text accessibilityRole="alert" style={styles.error}>{t('Não foi possível salvar. Tente novamente.', 'Could not save. Try again.', 'No se pudo guardar. Inténtalo de nuevo.')}</Text> : null}
            <Text style={styles.description}>{copy.timezone}: {group.timezone}</Text>
            <RaisedButton testID="group-settings-close" label={t('Fechar', 'Close', 'Cerrar')} variant="outlined" tone="neutral" disabled={unavailable} onPress={onClose} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'center', paddingHorizontal: 22, backgroundColor: 'rgba(0, 10, 24, 0.8)'},
  card: {width: '100%', maxWidth: 460, maxHeight: '90%', alignSelf: 'center', borderRadius: 26, backgroundColor: challengeTheme.colors.background, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, overflow: 'hidden'},
  content: {padding: 22, gap: 22},
  title: {fontSize: 22, fontWeight: '900', color: challengeTheme.colors.text},
  option: {gap: 8},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12},
  label: {flex: 1, fontSize: 17, fontWeight: '800', color: challengeTheme.colors.text},
  description: {fontSize: 14, lineHeight: 21, color: challengeTheme.colors.muted},
  error: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.danger},
});
