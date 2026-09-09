import React, {useCallback, useMemo, useRef, useState} from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type {HydrationReview} from '@aqualino/contracts';
import {API_BASE_URL} from '../../../shared/config/environment';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {UserAvatar} from '../../../shared/avatars/UserAvatar';
import {haptics} from '../../../shared/device/haptics';
import type {AppLocale} from '../../../shared/i18n/appLocale';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

const swipeThreshold = 96;
const swipeDistance = 460;

interface Props {
  review: HydrationReview;
  locale: AppLocale;
  onVote: (choice: 'valid' | 'invalid') => Promise<void>;
  onDismiss: () => void;
}

export function HydrationReviewCard({review, locale, onVote, onDismiss}: Props): React.JSX.Element {
  const english = locale === 'en-US';
  const pan = useRef(new Animated.ValueXY()).current;
  const submitting = useRef(false);
  const swipeFinished = useRef(false);
  const voteSucceeded = useRef(false);
  const dismissed = useRef(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const canDecide = photoLoaded && !photoError && !busy;

  const resetPosition = useCallback(() => {
    Animated.spring(pan, {toValue: {x: 0, y: 0}, useNativeDriver: true, bounciness: 7}).start();
  }, [pan]);
  const dismissOnce = useCallback(() => {
    if (dismissed.current) return;
    dismissed.current = true;
    onDismiss();
  }, [onDismiss]);
  const completeWhenReady = useCallback(() => {
    if (swipeFinished.current && voteSucceeded.current) dismissOnce();
  }, [dismissOnce]);
  const submit = useCallback(async (choice: 'valid' | 'invalid') => {
    if (!canDecide || submitting.current) return;
    submitting.current = true;
    swipeFinished.current = false;
    voteSucceeded.current = false;
    setBusy(true);
    setError(undefined);
    haptics.lightImpact();
    Animated.timing(pan, {
      toValue: {x: choice === 'valid' ? swipeDistance : -swipeDistance, y: 16},
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({finished}) => {
      swipeFinished.current = finished;
      completeWhenReady();
    });
    try {
      await onVote(choice);
      voteSucceeded.current = true;
      haptics.success();
      completeWhenReady();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (locale === 'es-ES' ? "No se pudo enviar el voto." : english ? 'Could not send the vote.' : 'Não foi possível enviar o voto.'));
      resetPosition();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }, [canDecide, completeWhenReady, english, locale, onVote, pan, resetPosition]);
  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => canDecide
      && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: Animated.event([null, {dx: pan.x, dy: pan.y}], {useNativeDriver: false}),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx >= swipeThreshold) submit('valid');
      else if (gesture.dx <= -swipeThreshold) submit('invalid');
      else resetPosition();
    },
    onPanResponderTerminate: resetPosition,
  }), [canDecide, pan, resetPosition, submit]);

  const validOpacity = pan.x.interpolate({inputRange: [0, swipeThreshold], outputRange: [0, 1], extrapolate: 'clamp'});
  const invalidOpacity = pan.x.interpolate({inputRange: [-swipeThreshold, 0], outputRange: [1, 0], extrapolate: 'clamp'});
  const rotation = pan.x.interpolate({inputRange: [-swipeDistance, 0, swipeDistance], outputRange: ['-13deg', '0deg', '13deg']});
  const photoSource = review.photo_path ? {
    uri: `${API_BASE_URL}${review.photo_path}`,
    headers: {Authorization: `Bearer ${secureTokenStore.getCached() ?? ''}`},
    cache: 'reload' as const,
  } : undefined;
  const date = new Date(review.occurred_at).toLocaleString(locale, {day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'});

  return (
    <Animated.View
      testID={`group-review-card-${review.id}`}
      accessibilityLabel={locale === 'es-ES' ? `${review.display_name}, ${review.amount_ml} ml. Desliza a la derecha si corresponde o a la izquierda si no corresponde.` : english ? `${review.display_name}, ${review.amount_ml} ml. Swipe right if it matches or left if it does not.` : `${review.display_name}, ${review.amount_ml} ml. Arraste para a direita se corresponde ou para a esquerda se não corresponde.`}
      {...panResponder.panHandlers}
      style={[styles.card, {transform: [{translateX: pan.x}, {translateY: pan.y}, {rotate: rotation}]}]}
    >
      {photoSource ? <Image
        key={photoAttempt}
        testID="hydration-review-photo"
        accessibilityLabel={locale === 'es-ES' ? "Foto tomada para el registro de agua" : english ? 'Photo taken for the water log' : 'Foto tirada para a marcação de água'}
        source={photoSource}
        onLoad={() => {setPhotoLoaded(true); setPhotoError(false);}}
        onError={() => {setPhotoLoaded(false); setPhotoError(true);}}
        resizeMode="cover"
        style={styles.photo}
      /> : null}
      <View pointerEvents="none" style={styles.photoShade} />
      <Animated.View pointerEvents="none" style={[styles.choiceStamp, styles.validStamp, {opacity: validOpacity}]}><Text style={styles.choiceLabel}>{locale === 'es-ES' ? 'VÁLIDO' : english ? 'VALID' : 'VÁLIDO'}</Text></Animated.View>
      <Animated.View pointerEvents="none" style={[styles.choiceStamp, styles.invalidStamp, {opacity: invalidOpacity}]}><Text style={styles.choiceLabel}>{locale === 'es-ES' ? 'NO VÁLIDO' : english ? 'INVALID' : 'INVÁLIDO'}</Text></Animated.View>

      <View pointerEvents="none" style={styles.topLine}>
        <UserAvatar avatarId={review.avatar_url} style={styles.avatar} />
        <View style={styles.person}>
          <Text numberOfLines={1} style={styles.name}>{review.display_name}</Text>
          <Text style={styles.date}>{date}</Text>
        </View>
      </View>
      <View pointerEvents="none" style={styles.bottomLine}>
        <Text style={styles.amount}>{review.amount_ml} ml</Text>
        <Text style={styles.prompt}>{locale === 'es-ES' ? '¿La foto corresponde?' : english ? 'Does the photo match?' : 'A foto corresponde?'}</Text>
      </View>

      {!photoLoaded && !photoError ? <View pointerEvents="none" style={styles.photoState}><Text style={styles.photoStateText}>{locale === 'es-ES' ? 'Cargando foto…' : english ? 'Loading photo…' : 'Carregando foto…'}</Text></View> : null}
      {photoError ? <View style={styles.photoState}>
        <Text accessibilityRole="alert" style={styles.photoStateText}>{locale === 'es-ES' ? 'No se pudo cargar la foto.' : english ? 'Could not load the photo.' : 'Não foi possível carregar a foto.'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={locale === 'es-ES' ? 'Volver a cargar la foto' : english ? 'Reload photo' : 'Recarregar foto'} onPress={() => {setPhotoError(false); setPhotoAttempt(value => value + 1);}} style={styles.reload}><Text style={styles.reloadText}>{locale === 'es-ES' ? 'Reintentar' : english ? 'Retry' : 'Tentar novamente'}</Text></Pressable>
      </View> : null}

      <View style={styles.actions}>
        <Pressable testID="review-invalid" accessibilityRole="button" accessibilityLabel={locale === 'es-ES' ? 'Marcar como inválido' : english ? 'Mark as invalid' : 'Marcar como inválida'} disabled={!canDecide} onPress={() => {submit('invalid');}} style={({pressed}) => [styles.action, styles.invalidAction, (!canDecide || pressed) && styles.actionDisabled]}>
          <Text style={styles.actionSymbol}>×</Text>
        </Pressable>
        <Text style={styles.gestureHint}>{locale === 'es-ES' ? 'Desliza para votar' : english ? 'Swipe to vote' : 'Arraste para votar'}</Text>
        <Pressable testID="review-valid" accessibilityRole="button" accessibilityLabel={locale === 'es-ES' ? 'Marcar como válido' : english ? 'Mark as valid' : 'Marcar como válida'} disabled={!canDecide} onPress={() => {submit('valid');}} style={({pressed}) => [styles.action, styles.validAction, (!canDecide || pressed) && styles.actionDisabled]}>
          <Text style={styles.actionSymbol}>✓</Text>
        </Pressable>
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 414, overflow: 'hidden', borderRadius: 26, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong,
    backgroundColor: challengeTheme.colors.backgroundDeep, shadowColor: '#000000', shadowOpacity: 0.42, shadowRadius: 15,
    shadowOffset: {width: 0, height: 8}, elevation: 9,
  },
  photo: {position: 'absolute', width: '100%', height: '100%'},
  photoShade: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 11, 27, 0.28)'},
  choiceStamp: {position: 'absolute', top: 24, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 3, borderRadius: 8, transform: [{rotate: '-10deg'}]},
  validStamp: {left: 22, borderColor: '#55EE9A'},
  invalidStamp: {right: 22, borderColor: '#FF6B81', transform: [{rotate: '10deg'}]},
  choiceLabel: {fontSize: 20, lineHeight: 25, fontWeight: '900', color: '#FFFFFF'},
  topLine: {position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', gap: 9},
  avatar: {width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#D8FBFF'},
  person: {flex: 1},
  name: {fontSize: 16, lineHeight: 20, fontWeight: '900', color: '#FFFFFF'},
  date: {fontSize: 11, lineHeight: 15, fontWeight: '700', color: '#D7F2F7'},
  bottomLine: {position: 'absolute', bottom: 76, left: 18, right: 18},
  amount: {fontSize: 33, lineHeight: 39, fontWeight: '900', color: '#FFFFFF'},
  prompt: {fontSize: 13, lineHeight: 18, fontWeight: '700', color: '#E0F8FC'},
  photoState: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: 'rgba(0, 20, 42, 0.82)'},
  photoStateText: {maxWidth: 240, textAlign: 'center', fontSize: 14, lineHeight: 20, fontWeight: '800', color: challengeTheme.colors.text},
  reload: {paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: challengeTheme.colors.cyanStrong},
  reloadText: {fontSize: 13, lineHeight: 18, fontWeight: '900', color: challengeTheme.colors.backgroundDeep},
  actions: {position: 'absolute', bottom: 12, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  action: {width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 23, borderWidth: 2, backgroundColor: '#FFFFFF'},
  invalidAction: {borderColor: '#FF6B81'},
  validAction: {borderColor: '#55EE9A'},
  actionDisabled: {opacity: 0.45},
  actionSymbol: {fontSize: 30, lineHeight: 34, fontWeight: '900', color: '#123040'},
  gestureHint: {fontSize: 11, lineHeight: 15, fontWeight: '900', color: '#FFFFFF', textShadowColor: '#00172C', textShadowRadius: 5},
  error: {position: 'absolute', right: 16, bottom: 64, left: 16, padding: 8, borderRadius: 10, overflow: 'hidden', backgroundColor: 'rgba(103, 14, 33, 0.9)', color: '#FFFFFF', fontSize: 12, lineHeight: 17, textAlign: 'center'},
});
