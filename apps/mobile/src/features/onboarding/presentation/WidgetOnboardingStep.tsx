import React, {useRef, useState} from 'react';
import {Alert, Platform, StyleSheet, Text, View} from 'react-native';
import type {AppLocale} from '../../../shared/i18n/appLocale';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {WidgetPreview} from './WidgetPreview';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {requestWidgetPin} from '../../widget/application/requestWidgetPin';

export function WidgetOnboardingStep({locale, onContinue}: {locale: AppLocale; onContinue: () => void}): React.JSX.Element {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const t = (pt: string, en: string, es: string) => locale === 'en-US' ? en : locale === 'es-ES' ? es : pt;
  const proceed = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(false);
    try {
      const requested = await requestWidgetPin();
      if (requested) {
        onContinue();
      } else {
        Alert.alert(t('Adicione o widget', 'Add the widget', 'Añade el widget'), Platform.OS === 'ios'
          ? t('Na tela inicial do iPhone, mantenha uma área vazia pressionada, toque em Editar e Adicionar Widget. Procure Aqualino e escolha Adicionar Widget.', 'On the iPhone Home Screen, touch and hold an empty area, tap Edit and Add Widget. Find Aqualino and choose Add Widget.', 'En la pantalla de inicio del iPhone, mantén pulsada un área vacía, toca Editar y Añadir widget. Busca Aqualino y elige Añadir widget.')
          : t('Mantenha uma área vazia da tela inicial pressionada, abra Widgets e escolha Aqualino. Você também pode fazer isso depois.', 'Touch and hold an empty area on your Home Screen, open Widgets and choose Aqualino. You can also do this later.', 'Mantén pulsada un área vacía de la pantalla de inicio, abre Widgets y elige Aqualino. También puedes hacerlo después.'),
        [{text: t('Continuar', 'Continue', 'Continuar'), onPress: onContinue}], {cancelable: false});
      }
    } catch {
      setError(true);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <View testID="onboarding-widget" style={styles.content}>
      <Text accessibilityRole="header" style={styles.title}>{t('Aqualino na sua tela inicial', 'Aqualino on your Home Screen', 'Aqualino en tu pantalla de inicio')}</Text>
      <Text style={styles.description}>{t('Acompanhe sua água do dia e abra o app com um toque, sem precisar procurar pelo ícone.', 'Follow your daily water intake and open the app with a tap, without searching for its icon.', 'Sigue tu agua del día y abre la app con un toque, sin buscar su icono.')}</Text>
      <WidgetPreview locale={locale} />
      <Text style={styles.description}>{t('Ao continuar, confirme a adição do widget na tela do sistema. Se preferir, cancele por lá.', 'Continue to confirm adding the widget on the system screen. You can cancel there if you prefer.', 'Continúa para confirmar el widget en la pantalla del sistema. Si prefieres, puedes cancelarlo allí.')}</Text>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{t('Não foi possível abrir o widget. Tente novamente.', 'Could not open the widget. Try again.', 'No se pudo abrir el widget. Inténtalo de nuevo.')}</Text> : null}
      <RaisedButton testID="onboarding-widget-add" label={t('Continuar', 'Continue', 'Continuar')} onPress={proceed} loading={busy} tone="aqua" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {gap: 22},
  title: {fontSize: 28, lineHeight: 35, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  description: {fontSize: 15, lineHeight: 23, color: challengeTheme.colors.muted, textAlign: 'center'},
  error: {color: challengeTheme.colors.danger, textAlign: 'center'},
});
