import React from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {PrivateGroup} from '@aqualino/contracts';
import type {AppLocale} from '../../../shared/i18n/appLocale';
import {AppModal} from '../../../shared/components/AppModal';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {GroupButton} from './GroupButton';
import {groupsCopy} from './groupsCopy';

interface Props {
  group: PrivateGroup;
  locale: AppLocale;
  canInvite: boolean;
  busy: boolean;
  onShare: () => void;
  onRenew: () => void;
  onClose: () => void;
}

export function GroupInvitation({group, locale, canInvite, busy, onShare, onRenew, onClose}: Props): React.JSX.Element {
  const copy = groupsCopy[locale];
  const expired = group.invite ? Date.parse(group.invite.expires_at) <= Date.now() : false;
  const full = group.members.length >= group.max_members;
  return (
    <AppModal onRequestClose={onClose} dismissible={!busy}>
      <SafeAreaView style={styles.overlay}>
        <Pressable accessible={false} onPress={onClose} disabled={busy} style={StyleSheet.absoluteFill} />
        <View testID="group-invite-panel" accessibilityViewIsModal style={styles.card}>
          <ScrollView contentContainerStyle={styles.content}>
            <Text accessibilityRole="header" style={styles.title}>{copy.invite}</Text>
            {group.joining_closed ? <Text style={styles.description}>{copy.joinClosed}</Text> : canInvite && group.invite ? <>
              <Text style={styles.description}>{copy.inviteHint}</Text>
              <Text selectable accessibilityLabel={`${copy.code}: ${group.invite.code}`} style={styles.code}>{group.invite.code}</Text>
              <Text style={styles.description}>{expired ? copy.expired : copy.expires(new Date(group.invite.expires_at).toLocaleDateString(locale))}</Text>
              {full ? <Text style={styles.description}>{copy.full}</Text> : null}
              <GroupButton label={copy.share} onPress={onShare} disabled={busy || expired || full} />
              <GroupButton label={copy.renew} onPress={onRenew} secondary disabled={busy || full} />
            </> : <Text style={styles.description}>{full ? copy.full : copy.askOwner}</Text>}
            <RaisedButton testID="group-invite-close" label={locale === 'en-US' ? 'Close' : locale === 'es-ES' ? 'Cerrar' : 'Fechar'}
              variant="outlined" tone="neutral" disabled={busy} onPress={onClose} />
          </ScrollView>
        </View>
      </SafeAreaView>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'center', paddingHorizontal: 22, backgroundColor: 'rgba(0, 10, 24, 0.8)'},
  card: {width: '100%', maxWidth: 460, maxHeight: '90%', alignSelf: 'center', borderRadius: 26, backgroundColor: challengeTheme.colors.background, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, overflow: 'hidden'},
  content: {padding: 22, gap: 18},
  title: {fontSize: 22, fontWeight: '900', color: challengeTheme.colors.text},
  description: {fontSize: 14, lineHeight: 21, color: challengeTheme.colors.muted},
  code: {fontSize: 22, letterSpacing: 2, fontWeight: '900', color: challengeTheme.colors.cyanStrong, paddingVertical: 10},
});
