import React, {useEffect, useRef, useState} from 'react';
import {KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {GroupInvitePreview} from '@aqualino/contracts';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {GroupButton} from './GroupButton';
import type {GroupsCopy} from './groupsCopy';
import {AppModal} from '../../../shared/components/AppModal';

interface Props {
  mode: 'create' | 'join'; copy: GroupsCopy; busy: boolean; error?: string;
  onClose: () => void; onClearError: () => void;
  onCreate: (name: string) => Promise<boolean>;
  onPreview: (code: string) => Promise<GroupInvitePreview | null>;
  onAccept: (code: string) => Promise<boolean>;
}

export function GroupForm(props: Props): React.JSX.Element {
  const [submitting, setSubmitting] = useState(false);
  return (
    <AppModal onRequestClose={props.onClose} dismissible={!props.busy && !submitting}>
      <GroupFormContent {...props} busy={props.busy || submitting} onSubmittingChange={setSubmitting} />
    </AppModal>
  );
}

// Keep input state inside the modal so typing does not republish its content through the portal.
function GroupFormContent({mode, copy, busy, error, onClose, onClearError, onCreate, onPreview, onAccept, onSubmittingChange}: Props & {onSubmittingChange: (pending: boolean) => void}): React.JSX.Element {
  const [value, setValue] = useState('');
  const [initialCode, setInitialCode] = useState('');
  const [preview, setPreview] = useState<{code: string; details: GroupInvitePreview} | null>(null);
  const [localError, setLocalError] = useState<string>();
  const latestValue = useRef('');
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false;};
  }, []);
  const isCreate = mode === 'create';
  const normalize = (text: string) => isCreate ? text.trim() : text.trim().toUpperCase();
  const isValid = (text: string) => isCreate ? [...text].length >= 3 && [...text].length <= 60 : /^[A-Z0-9]{12}$/.test(text);
  const valid = isValid(normalize(value));
  const full = Boolean(preview && preview.details.member_count >= preview.details.max_members);
  const submit = async () => {
    const submittedValue = preview?.code ?? normalize(latestValue.current);
    if (inFlight.current || busy || full || !isValid(submittedValue)) return;
    inFlight.current = true;
    onSubmittingChange(true);
    setLocalError(undefined);
    try {
      if (isCreate) {
        if (await onCreate(submittedValue) && mounted.current) onClose();
      } else if (preview) {
        if (await onAccept(submittedValue) && mounted.current) onClose();
      } else {
        const details = await onPreview(submittedValue);
        if (mounted.current && details) setPreview({code: submittedValue, details});
      }
    } catch {
      if (mounted.current) setLocalError(copy.actionError);
    } finally {
      inFlight.current = false;
      if (mounted.current) onSubmittingChange(false);
    }
  };
  const changeValue = (text: string) => {
    if (inFlight.current) return;
    latestValue.current = text;
    setValue(text);
    if (localError) setLocalError(undefined);
    if (error) onClearError();
  };

  return (
    <View style={styles.backdrop}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
            <View accessibilityViewIsModal style={styles.card}>
              <Text accessibilityRole="header" style={styles.title}>{isCreate ? copy.create : copy.join}</Text>
              <Text style={styles.description}>{isCreate ? copy.createDescription : copy.joinDescription}</Text>
              {preview ? (
                <View style={styles.preview}>
                  <Text style={styles.title}>{preview.details.name}</Text>
                  <Text style={styles.description}>{copy.memberCount(preview.details.member_count, preview.details.max_members)}</Text>
                  <Text style={styles.description}>{copy.timezone}: {preview.details.timezone}</Text>
                  <Text style={styles.description}>{copy.consent}</Text>
                  {full ? <Text accessibilityRole="alert" style={styles.error}>{copy.full}</Text> : null}
                </View>
              ) : (
                <>
                  <Text style={styles.label}>{isCreate ? copy.groupName : copy.code}</Text>
                  <TextInput testID={isCreate ? 'group-name' : 'group-code'} accessibilityLabel={isCreate ? copy.groupName : copy.code}
                    accessibilityHint={isCreate ? copy.nameHint : copy.codeHint}
                    value={isCreate ? value : undefined} defaultValue={isCreate ? undefined : initialCode} onChangeText={changeValue}
                    placeholder={isCreate ? copy.namePlaceholder : copy.codePlaceholder}
                    placeholderTextColor={challengeTheme.colors.muted}
                    autoCapitalize={isCreate ? 'sentences' : 'none'} autoCorrect={false} spellCheck={false}
                    keyboardType={isCreate ? 'default' : 'ascii-capable'}
                    autoComplete="off" textContentType="none"
                    editable={!busy} maxLength={isCreate ? 60 : 32}
                    returnKeyType="done" onSubmitEditing={event => {
                      if (inFlight.current) return;
                      latestValue.current = event.nativeEvent.text;
                      setValue(event.nativeEvent.text);
                      submit();
                    }} style={[styles.input, !isCreate && styles.code]} />
                  <Text style={styles.hint}>{isCreate ? copy.nameHint : copy.codeHint}</Text>
                </>
              )}
              {localError || error ? <Text accessibilityRole="alert" style={styles.error}>{localError ?? error}</Text> : null}
              <GroupButton label={isCreate ? copy.create : preview ? copy.accept : copy.preview} onPress={submit} disabled={!valid || full} busy={busy} />
              {preview ? <GroupButton label={copy.back} secondary disabled={busy} onPress={() => {setInitialCode(latestValue.current); setPreview(null); setLocalError(undefined); onClearError();}} /> : null}
              <GroupButton label={copy.cancel} secondary disabled={busy} onPress={onClose} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
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
