import React, {useEffect, useRef, useState} from 'react';
import {ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchCamera} from 'react-native-image-picker';
import Animated, {Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {haptics} from '../../../shared/device/haptics';
import {useSessionStore} from '../../auth/application/sessionStore';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useHydrationPreferencesStore} from '../application/hydrationPreferencesStore';
import {useQuickHydration} from './useHydrationHome';

type Props = NativeStackScreenProps<RootStackParamList, 'QuickHydration'>;

export function QuickHydrationScreen({navigation, route}: Props): React.JSX.Element {
  const favorites = useSessionStore(state => state.user?.profile.favorite_volumes_ml);
  const volumes = favorites?.length ? favorites : [200, 300, 500];
  const selectAmount = useHydrationPreferencesStore(state => state.selectAmount);
  const lastAmount = useHydrationPreferencesStore(state => state.lastAmountMl);
  const {record, isRecording} = useQuickHydration();
  const submitting = useRef(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [photoUri, setPhotoUri] = useState(route.params?.photoUri);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [error, setError] = useState<string>();
  const entrance = useSharedValue(24);
  const busy = isRecording || pendingAmount !== null || takingPhoto;
  const source = route.params?.source === 'widget'
    ? 'widget'
    : route.params?.source === 'mobile' ? 'mobile' : 'shortcut';

  useEffect(() => {
    entrance.value = withTiming(0, {duration: 220, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System});
  }, [entrance]);
  const entranceStyle = useAnimatedStyle(() => ({transform: [{translateY: entrance.value}]}));

  const close = () => {
    if (busy) return;
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('Home');
  };

  const submit = async (amount: number) => {
    if (submitting.current || busy || !photoUri) return;
    submitting.current = true;
    setPendingAmount(amount);
    setError(undefined);
    haptics.lightImpact();
    try {
      selectAmount(amount);
      await record({amountMl: amount, source});
      haptics.success();
      navigation.popTo('Home', {recordedAmountMl: amount});
    } catch (reason) {
      submitting.current = false;
      setPendingAmount(null);
      setError(reason instanceof Error ? reason.message : 'Não foi possível registrar. Tente novamente.');
    }
  };

  const takePhoto = async () => {
    if (busy) return;
    setTakingPhoto(true);
    setError(undefined);
    try {
      const result = await launchCamera({
        mediaType: 'photo', cameraType: 'back', quality: 0.8, maxWidth: 1920, maxHeight: 1920,
        saveToPhotos: false, includeBase64: false,
      });
      if (result.didCancel) return;
      const uri = result.assets?.[0]?.uri;
      if (result.errorCode || !uri) {
        setError('A foto é necessária para registrar. Verifique a câmera e tente novamente.');
        return;
      }
      setPhotoUri(uri);
    } catch {
      setError('A foto é necessária para registrar. Verifique a câmera e tente novamente.');
    } finally {
      setTakingPhoto(false);
    }
  };

  return (
    <View style={styles.page}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar registro de água" disabled={busy} onPress={close} style={StyleSheet.absoluteFill} />
      <Animated.View accessibilityViewIsModal style={[styles.sheet, entranceStyle]}>
        <SafeAreaView edges={['bottom']}>
          <View style={styles.handle} />
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={styles.iconOrb}>
                <AqualinoIcon name="waterPlus" size={32} color={challengeTheme.colors.cyanStrong} />
              </View>
              <View style={styles.heading}>
                <Text style={styles.eyebrow}>BEBI ÁGUA</Text>
                <Text accessibilityRole="header" style={styles.title}>Quanto você bebeu?</Text>
              </View>
            </View>
            <Text style={styles.subtitle}>{photoUri ? 'Toque no volume para registrar.' : 'Primeiro, tire uma foto do seu copo ou garrafa.'}</Text>

            {photoUri ? (
              <View style={styles.photoPreview}>
                <Image accessibilityLabel="Foto do seu copo ou garrafa" source={{uri: photoUri}} resizeMode="cover" style={styles.photo} />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={photoUri ? 'Trocar foto' : 'Tirar foto do copo'}
              disabled={busy}
              onPress={takePhoto}
              style={({pressed}) => [styles.photoButton, busy && styles.dimmed, pressed && styles.photoButtonPressed]}>
              {takingPhoto ? <ActivityIndicator size="small" color={challengeTheme.colors.cyanStrong} /> : <AqualinoIcon name="plus" size={16} color={challengeTheme.colors.cyanStrong} />}
              <Text style={styles.photoButtonLabel}>{photoUri ? 'Trocar foto' : 'Tirar foto do copo'}</Text>
            </Pressable>

            <View style={styles.buttons}>
              {volumes.map(volume => {
                const isPending = pendingAmount === volume;
                return (
                  <Pressable
                    key={volume}
                    accessibilityRole="button"
                    accessibilityLabel={`Registrar ${volume} ml de água`}
                    accessibilityState={{disabled: busy || !photoUri, busy: isPending}}
                    disabled={busy || !photoUri}
                    onPress={() => {submit(volume);}}
                    style={({pressed}) => [styles.volumeButton, isPending && styles.volumeButtonSelected, ((!photoUri || busy) && !isPending) && styles.dimmed, pressed && styles.volumeButtonPressed]}>
                    {isPending ? <ActivityIndicator color={challengeTheme.colors.backgroundDeep} /> : <AqualinoIcon name="water" size={28} color={challengeTheme.colors.cyanStrong} />}
                    <Text style={[styles.volumeLabel, isPending && styles.selectedText]}>{volume}</Text>
                    <Text style={[styles.volumeUnit, isPending && styles.selectedText]}>ml</Text>
                    {lastAmount === volume && !isPending ? <View style={styles.favoriteDot} /> : null}
                  </Pressable>
                );
              })}
            </View>

            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {pendingAmount !== null ? `Registrando ${pendingAmount} ml…` : photoUri ? 'Sua gota acompanha cada gole.' : 'A foto libera o registro do volume.'}
            </Text>
            {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          </ScrollView>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 10, 24, 0.62)'},
  sheet: {
    maxHeight: '88%', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    backgroundColor: challengeTheme.colors.background, borderWidth: 1, borderBottomWidth: 0,
    borderColor: challengeTheme.colors.borderStrong, overflow: 'hidden',
  },
  handle: {alignSelf: 'center', width: 38, height: 4, marginTop: 10, borderRadius: 2, backgroundColor: challengeTheme.colors.borderStrong},
  content: {paddingHorizontal: 22, paddingTop: 22, paddingBottom: 20, gap: 14},
  header: {flexDirection: 'row', alignItems: 'center', gap: 12},
  heading: {flex: 1, gap: 3},
  iconOrb: {
    width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
    backgroundColor: challengeTheme.colors.panelSoft, borderWidth: 1, borderColor: challengeTheme.colors.border,
  },
  eyebrow: {fontSize: 10, lineHeight: 14, letterSpacing: 1.4, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  title: {fontSize: 23, lineHeight: 29, fontWeight: '900', color: challengeTheme.colors.text},
  subtitle: {color: challengeTheme.colors.muted, fontSize: 14, lineHeight: 20},
  buttons: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  volumeButton: {
    flexBasis: '28%', flexGrow: 1, minHeight: 124, alignItems: 'center', justifyContent: 'center', gap: 4,
    borderRadius: 20, borderWidth: 1.5, borderColor: challengeTheme.colors.borderStrong,
    backgroundColor: challengeTheme.colors.panel,
  },
  volumeButtonSelected: {backgroundColor: challengeTheme.colors.cyanStrong, borderColor: challengeTheme.colors.text, transform: [{scale: 1.035}]},
  volumeButtonPressed: {transform: [{scale: 0.96}], backgroundColor: challengeTheme.colors.panelSoft},
  volumeLabel: {fontSize: 26, lineHeight: 32, fontWeight: '900', color: challengeTheme.colors.text},
  volumeUnit: {fontSize: 13, lineHeight: 17, fontWeight: '700', color: challengeTheme.colors.muted},
  selectedText: {color: challengeTheme.colors.backgroundDeep},
  favoriteDot: {position: 'absolute', top: 10, right: 10, width: 5, height: 5, borderRadius: 3, backgroundColor: challengeTheme.colors.cyanStrong},
  dimmed: {opacity: 0.4},
  status: {textAlign: 'center', fontSize: 13, lineHeight: 19, color: challengeTheme.colors.cyanStrong},
  error: {color: challengeTheme.colors.danger, fontSize: 13, lineHeight: 19},
  photoPreview: {height: 104, borderRadius: 16, overflow: 'hidden'},
  photo: {width: '100%', height: '100%'},
  photoButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, borderWidth: 1, borderColor: challengeTheme.colors.border},
  photoButtonPressed: {opacity: 0.75},
  photoButtonLabel: {fontSize: 13, lineHeight: 18, fontWeight: '700', color: challengeTheme.colors.muted},
});
