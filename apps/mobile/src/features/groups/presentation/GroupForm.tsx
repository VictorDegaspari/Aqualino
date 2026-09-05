import React, {useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {GroupInvitePreview} from '@aqualino/contracts';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {GroupButton} from './GroupButton';
import type {GroupsCopy} from './groupsCopy';
import {AppModal} from '../../../shared/components/AppModal';

export function GroupForm({mode, copy, busy, error, onClose, onClearError, onCreate, onPreview, onAccept}: {
  mode: 'create' | 'join'; copy: GroupsCopy; busy: boolean; error?: string;
  onClose: () => void; onClearError: () => void;
  onCreate: (name: string) => Promise<boolean>;
  onPreview: (code: string) => Promise<GroupInvitePreview | null>;
  onAccept: (code: string) => Promise<boolean>;
}): React.JSX.Element {
  const [value, setValue] = useState('');
  const [preview, setPreview] = useState<GroupInvitePreview | null>(null);
  const isCreate = mode === 'create';
  const normalized = isCreate ? value.trim() : value.trim().toUpperCase();
  const valid = isCreate ? [...normalized].length >= 3 && [...normalized].length <= 60 : /^[A-Z0-9]{12}$/.test(normalized);
  const full = Boolean(preview && preview.member_count >= preview.max_members);
  const submit = async () => {
    if (!valid || busy || full) return;
    if (isCreate) {
      if (await onCreate(normalized)) onClose();
    } else if (preview) {
      if (await onAccept(normalized)) onClose();
    } else {
      setPreview(await onPreview(normalized));
    }
  };

  return (
    <AppModal onRequestClose={onClose} dismissible={!busy}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
              <View accessibilityViewIsModal style={styles.card}>
                <Text accessibilityRole="header" style={styles.title}>{isCreate ? copy.create : copy.join}</Text>
                <Text style={styles.description}>{isCreate ? copy.createDescription : copy.joinDescription}</Text>
                {preview ? (
                  <View style={styles.preview}>
                    <Text style={styles.title}>{preview.name}</Text>
                    <Text style={styles.description}>{copy.memberCount(preview.member_count, preview.max_members)}</Text>
                    <Text style={styles.description}>{copy.timezone}: {preview.timezone}</Text>
                    <Text style={styles.description}>{copy.consent}</Text>
                    {full ? <Text accessibilityRole="alert" style={styles.error}>{copy.full}</Text> : null}
                  </View>
                ) : (
                  <>
                    <Text style={styles.label}>{isCreate ? copy.groupName : copy.code}</Text>
                    <TextInput testID={isCreate ? 'group-name' : 'group-code'} accessibilityLabel={isCreate ? copy.groupName : copy.code}
                      accessibilityHint={isCreate ? copy.nameHint : copy.codeHint}
                      value={value} onChangeText={text => {setValue(text); onClearError();}}
                      placeholder={isCreate ? copy.namePlaceholder : copy.codePlaceholder}
                      placeholderTextColor={challengeTheme.colors.muted}
                      autoCapitalize={isCreate ? 'sentences' : 'characters'} autoCorrect={false}
                      editable={!busy} maxLength={isCreate ? 60 : 32}
                      returnKeyType="done" onSubmitEditing={submit} style={[styles.input, !isCreate && styles.code]} />
                    <Text style={styles.hint}>{isCreate ? copy.nameHint : copy.codeHint}</Text>
                  </>
                )}
                {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
                <GroupButton label={isCreate ? copy.create : preview ? copy.accept : copy.preview} onPress={submit} disabled={!valid || full} busy={busy} />
                {preview ? <GroupButton label={copy.back} secondary disabled={busy} onPress={() => {setPreview(null); onClearError();}} /> : null}
                <GroupButton label={copy.cancel} secondary disabled={busy} onPress={onClose} />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {flex: 1, backgroundColor: 'rgba(0, 10, 20, 0.88)'}, safeArea: {flex: 1}, keyboard: {flex: 1},
  scroll: {flexGrow: 1, justifyContent: 'center', padding: 20},
  card: {padding: 22, gap: 14, borderRadius: 24, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.background},
  title: {fontSize: 23, fontWeight: '900', color: challengeTheme.colors.text},
  description: {fontSize: 14, lineHeight: 21, color: challengeTheme.colors.muted},
  label: {fontSize: 14, fontWeight: '800', color: challengeTheme.colors.text},
  input: {minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panelSoft, color: challengeTheme.colors.text, fontSize: 17, paddingHorizontal: 14, paddingVertical: 12},
  code: {letterSpacing: 2}, hint: {fontSize: 12, lineHeight: 18, color: challengeTheme.colors.muted},
  error: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.danger},
  preview: {gap: 12, paddingVertical: 10},
});
