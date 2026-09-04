import React, {useState} from 'react';
import {ActivityIndicator, Alert, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {haptics} from '../../../shared/device/haptics';
import {useSessionStore} from '../../auth/application/sessionStore';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useHydrationPreferencesStore} from '../application/hydrationPreferencesStore';
import {useQuickHydration} from './useHydrationHome';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickHydration'>;

export function QuickHydrationScreen({navigation, route}: Props): React.JSX.Element {
  const volumes = useSessionStore(state => state.user?.profile.favorite_volumes_ml ?? [200, 300, 500]);
  const selectAmount = useHydrationPreferencesStore(state => state.selectAmount);
  const {record, isRecording} = useQuickHydration();
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const photoUri = route.params?.photoUri;
  const source = route.params?.source === 'widget'
    ? 'widget'
    : route.params?.source === 'mobile'
      ? 'mobile'
      : 'shortcut';

  const submit = async (amount: number) => {
    if (isRecording) return;

    selectAmount(amount);
    setPendingAmount(amount);
    haptics.selection();
    try {
      await record({amountMl: amount, source});
      haptics.success();
      navigation.navigate('Home');
    } catch (error) {
      setPendingAmount(null);
      Alert.alert('Não foi possível registrar', error instanceof Error ? error.message : 'Tente novamente.');
    }
  };

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
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <View style={styles.iconOrb}>
              <AqualinoIcon name="waterPlus" size={48} color={challengeTheme.colors.cyanStrong} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>Bebi água</Text>
            <Text style={styles.subtitle}>Registre sua hidratação e avance no seu percurso.</Text>
          </View>

          {photoUri ? (
            <View style={styles.photoPreview}>
              <Image source={{uri: photoUri}} resizeMode="cover" style={styles.photo} />
              <View style={styles.photoCaption}>
                <AqualinoIcon name="check" size={16} color={challengeTheme.colors.cyanStrong} />
                <Text style={styles.photoCaptionText}>Foto do seu copo ou garrafa</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Quanto você bebeu?</Text>
            <Text style={styles.panelSubtitle}>Escolha um dos seus volumes favoritos.</Text>
            <View style={styles.buttons}>
              {volumes.map(volume => {
                const isPending = pendingAmount === volume;

                return (
                  <Pressable
                    key={volume}
                    accessibilityRole="button"
                    accessibilityLabel={`Registrar ${volume} ml de água`}
                    accessibilityState={{disabled: isRecording, busy: isPending}}
                    disabled={isRecording}
                    onPress={() => submit(volume)}
                    style={({pressed}) => [styles.volumeButton, pressed && !isRecording && styles.volumeButtonPressed]}>
                    {isPending ? (
                      <ActivityIndicator color={challengeTheme.colors.backgroundDeep} />
                    ) : (
                      <>
                        <AqualinoIcon name="water" size={24} color={challengeTheme.colors.backgroundDeep} />
                        <Text style={styles.volumeLabel}>{volume} ml</Text>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.notice}>
              <AqualinoIcon name="check" size={17} color={challengeTheme.colors.cyanStrong} />
              <Text style={styles.noticeText}>Cada toque é protegido contra registros duplicados.</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.72},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.54)'},
  safeArea: {flex: 1},
  content: {flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 32, gap: 28},
  hero: {alignItems: 'center', gap: 10},
  iconOrb: {
    width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(11, 225, 236, 0.14)', borderWidth: 1, borderColor: 'rgba(51, 243, 250, 0.56)',
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: {width: 0, height: 0}, elevation: 8,
  },
  title: {fontSize: 31, lineHeight: 38, fontWeight: '900', color: challengeTheme.colors.text},
  subtitle: {maxWidth: 290, textAlign: 'center', color: challengeTheme.colors.muted, fontSize: 16, lineHeight: 23},
  photoPreview: {height: 146, overflow: 'hidden', borderRadius: challengeTheme.radius.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.panel},
  photo: {width: '100%', height: '100%'},
  photoCaption: {position: 'absolute', right: 9, bottom: 9, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: challengeTheme.radius.pill, backgroundColor: 'rgba(0, 13, 32, 0.82)'},
  photoCaptionText: {fontSize: 11, lineHeight: 15, fontWeight: '800', color: challengeTheme.colors.text},
  panel: {
    gap: 8, padding: 22, borderRadius: challengeTheme.radius.panel, backgroundColor: challengeTheme.colors.panel,
    borderWidth: 1, borderColor: challengeTheme.colors.borderStrong,
    shadowColor: '#000000', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: {width: 0, height: 10}, elevation: 7,
  },
  panelTitle: {fontSize: 21, lineHeight: 27, fontWeight: '900', color: challengeTheme.colors.text},
  panelSubtitle: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.muted},
  buttons: {flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14},
  volumeButton: {
    minWidth: '46%', flexGrow: 1, height: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: challengeTheme.radius.pill, backgroundColor: challengeTheme.colors.cyanStrong,
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.6, shadowRadius: 11, shadowOffset: {width: 0, height: 4}, elevation: 7,
  },
  volumeButtonPressed: {opacity: 0.9, transform: [{scale: 0.985}, {translateY: 2}]},
  volumeLabel: {fontSize: 18, lineHeight: 24, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  notice: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: challengeTheme.colors.border},
  noticeText: {flex: 1, fontSize: 12, lineHeight: 17, color: challengeTheme.colors.muted},
});
