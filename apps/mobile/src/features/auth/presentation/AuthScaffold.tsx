import React from 'react';
import {Image, StyleSheet, Text, TextInput, type TextInputProps, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {mascotImages} from '../../../assets/mascot/mascotImages';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {typography} from '../../../shared/theme/typography';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {KeyboardAwareScrollView} from '../../../shared/components/KeyboardAwareScrollView';
import {SecurityLink} from './AccountSecurityParts';

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  back?: {label: string; onPress: () => void; disabled?: boolean};
}

export function AuthScaffold({eyebrow, title, subtitle, children, back}: AuthScaffoldProps): React.JSX.Element {
  return (
    <View style={styles.page}>
      <Image
        pointerEvents="none"
        source={require('../../../assets/challenge/static/ocean-background.webp')}
        resizeMode="cover"
        style={styles.background}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />
      <SafeAreaView style={styles.safeArea}>
        {back ? <View style={styles.navigation}><SecurityLink {...back} variant="text" /></View> : null}
        <KeyboardAwareScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.mascotOrb}>
              <Image source={mascotImages.empty} resizeMode="contain" style={styles.mascot} />
            </View>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <View style={styles.panel}>{children}</View>
        </KeyboardAwareScrollView>
      </SafeAreaView>
    </View>
  );
}

interface AuthFieldProps extends TextInputProps {
  label: string;
}

export function AuthField({label, ...props}: AuthFieldProps): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={challengeTheme.colors.muted}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

interface AuthButtonProps {
  testID?: string;
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function AuthButton({testID, label, onPress, loading, disabled}: AuthButtonProps): React.JSX.Element {
  return <RaisedButton testID={testID} label={label} onPress={onPress} loading={loading} disabled={disabled} tone="aqua" />;
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.68},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.57)'},
  safeArea: {flex: 1},
  navigation: {paddingHorizontal: 20, paddingTop: 6, alignItems: 'flex-start'},
  content: {flexGrow: 1, paddingHorizontal: 20, paddingVertical: 26, gap: 23, justifyContent: 'center'},
  hero: {alignItems: 'center', gap: 7, paddingHorizontal: 14},
  mascotOrb: {
    width: 128, height: 128, marginBottom: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 64,
    borderWidth: 1, borderColor: 'rgba(145, 200, 209, 0.58)', backgroundColor: 'rgba(26, 78, 95, 0.52)',
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: {width: 0, height: 4}, elevation: 8,
  },
  mascot: {width: 123, height: 112},
  eyebrow: {fontFamily: typography.family, fontSize: 10, lineHeight: 14, letterSpacing: 1.15, fontWeight: '900', color: challengeTheme.colors.cyanStrong, textAlign: 'center'},
  title: {fontFamily: typography.family, fontSize: 31, lineHeight: 38, fontWeight: '900', color: challengeTheme.colors.text, textAlign: 'center'},
  subtitle: {fontFamily: typography.family, maxWidth: 315, fontSize: 15, lineHeight: 21, color: challengeTheme.colors.muted, textAlign: 'center'},
  panel: {
    gap: 14, padding: 19, borderRadius: challengeTheme.radius.panel, borderWidth: 1,
    borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel,
    shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 8,
  },
  field: {gap: 7},
  fieldLabel: {fontFamily: typography.family, fontSize: 13, lineHeight: 18, fontWeight: '800', color: '#D6EAEB'},
  input: {
    height: 54, paddingHorizontal: 15, borderRadius: 16, borderWidth: 1,
    borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panelSoft,
    color: challengeTheme.colors.text, fontFamily: typography.family, fontSize: 16, fontWeight: '700',
  },
});
