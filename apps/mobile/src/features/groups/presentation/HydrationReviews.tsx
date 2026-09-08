import React, {useRef, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useInfiniteQuery, useQueryClient} from '@tanstack/react-query';
import {useIsFocused} from '@react-navigation/native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {HydrationReview, HydrationReviewPage} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';
import {API_BASE_URL} from '../../../shared/config/environment';
import {secureTokenStore} from '../../../shared/security/secureTokenStore';
import {AppModal} from '../../../shared/components/AppModal';
import {LoadingWaterDrop} from '../../../shared/components/LoadingWaterDrop';
import {AppError} from '../../../shared/errors/AppError';
import {UserAvatar} from '../../../shared/avatars/UserAvatar';
import {useSessionStore} from '../../auth/application/sessionStore';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {GroupButton} from './GroupButton';
import type {AppLocale} from '../../../shared/i18n/appLocale';

export function HydrationReviews({groupId, memberCount, reviewEnabled = true, locale = 'pt-BR'}: {groupId: string; memberCount: number; reviewEnabled?: boolean; locale?: AppLocale}): React.JSX.Element {
  const english = locale === 'en-US';
  const userId = useSessionStore(state => state.user?.id);
  const refreshUser = useSessionStore(state => state.refreshUser);
  const focused = useIsFocused();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>();
  const query = useInfiniteQuery({
    queryKey: ['groups', userId, groupId, 'reviews'],
    queryFn: ({pageParam, signal}) => apiRequest<HydrationReviewPage>(`/groups/current/reviews?page=${pageParam}`, {signal, unwrapData: false}),
    initialPageParam: 1,
    getNextPageParam: page => page.meta.current_page < page.meta.last_page ? page.meta.current_page + 1 : undefined,
    enabled: Boolean(userId) && focused,
    refetchInterval: focused ? 30_000 : false,
  });
  const reviews = query.data?.pages.flatMap(page => page.data) ?? [];
  const selected = reviews.find(review => review.id === selectedId);
  const vote = async (choice: 'valid' | 'invalid') => {
    if (!selected) return;
    await apiRequest<HydrationReview>(`/hydration/logs/${selected.id}/votes`, {method: 'POST', body: {vote: choice}, timeoutMs: 15_000});
    setSelectedId(undefined);
    queryClient.invalidateQueries({queryKey: ['groups']});
    queryClient.invalidateQueries({queryKey: ['hydration']});
    refreshUser().catch(() => undefined);
  };

  return <View testID="group-hydration-reviews" style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>{locale === 'es-ES' ? "Revisar registros" : english ? 'Review water logs' : 'Conferir marcações'}</Text>
    <Text style={styles.text}>{!reviewEnabled ? (locale === 'es-ES' ? "El líder ha desactivado la votación para los nuevos envíos. Puedes revisar y votar en los registros abiertos." : english ? 'The leader disabled voting for new submissions. Open reviews remain available.' : 'O líder desabilitou a votação para novos envios. Você ainda pode conferir e votar nas marcações já abertas.') : memberCount > 2
      ? (locale === 'es-ES' ? "Revisa la foto y la cantidad indicada. Solo votan los otros miembros, hasta 12 horas después de la sincronización." : english ? 'Check the photo and reported volume. Other members have 12 hours to vote after synchronization.' : 'Confira a foto e o volume informado. Só os outros membros votam, por até 12 horas após a sincronização.')
      : (locale === 'es-ES' ? "Los nuevos registros se someten a votación cuando el grupo tiene al menos 3 personas." : english ? 'New logs can be reviewed when the group has at least 3 people.' : 'Novas marcações entram em votação quando o grupo tem pelo menos 3 pessoas.')}</Text>
    <Text style={styles.caption}>{locale === 'es-ES' ? "Para anular se necesita más de la mitad de los otros miembros con derecho a voto. Los empates y las abstenciones mantienen el registro válido. Cada persona vota una vez." : english ? 'Invalidation requires more than half of all other eligible members. Ties and abstentions keep the log valid. Each person votes once.' : 'Anular exige mais da metade de todos os outros membros elegíveis. Empates e votos ausentes mantêm a marcação válida. Cada pessoa vota uma vez.'}</Text>
    {query.isPending ? <LoadingWaterDrop accessibilityLabel={locale === 'es-ES' ? "Cargando registros para revisar" : english ? 'Loading logs for review' : 'Carregando marcações para revisão'} size={44} /> : null}
    {query.isError ? <><Text accessibilityRole="alert" style={styles.error}>{locale === 'es-ES' ? "No se pudieron actualizar los registros." : english ? 'Could not refresh the logs.' : 'Não foi possível atualizar as marcações.'}</Text><GroupButton label={locale === 'es-ES' ? "Intentar de nuevo" : english ? 'Try again' : 'Tentar novamente'} onPress={() => {query.refetch();}} secondary /></> : null}
    {!query.isPending && !query.isError && reviews.length === 0 ? <Text style={styles.text}>{locale === 'es-ES' ? "Todavía no hay registros para revisar." : english ? 'No logs to review yet.' : 'Nenhuma marcação para conferir por enquanto.'}</Text> : null}
    {reviews.map(review => <Pressable key={review.id} testID={`group-review-${review.id}`} accessibilityRole="button"
      accessibilityLabel={`${locale === 'es-ES' ? "Revisar" : english ? 'Review' : 'Conferir'} ${review.amount_ml} ml · ${review.display_name}. ${statusLabel(review, locale)}`}
      onPress={() => setSelectedId(review.id)} style={({pressed}) => [styles.row, pressed && styles.pressed]}>
      <UserAvatar avatarId={review.avatar_url} style={styles.avatar} />
      <View style={styles.rowText}>
        <Text style={styles.name}>{review.display_name}{review.user_id === userId ? (locale === 'es-ES' ? " · Tú" : english ? ' · You' : ' · Você') : ''}</Text>
        <Text style={styles.text}>{review.amount_ml} ml · {new Date(review.occurred_at).toLocaleString(locale, {day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}</Text>
        <Text style={[styles.caption, review.status === 'invalid' && styles.error]}>{statusLabel(review, locale)} · {review.invalid_votes}/{review.invalid_votes_required} {locale === 'es-ES' ? "votos para anular" : english ? 'votes to invalidate' : 'votos para anular'}</Text>
      </View>
      <Text style={styles.link}>{locale === 'es-ES' ? "Ver" : english ? 'View' : 'Ver'}</Text>
    </Pressable>)}
    {query.hasNextPage ? <GroupButton label={locale === 'es-ES' ? "Cargar más registros" : english ? 'Load more logs' : 'Carregar mais marcações'} onPress={() => {query.fetchNextPage();}} busy={query.isFetchingNextPage} secondary /> : null}
    {selected ? <HydrationReviewDialog key={selected.id} review={selected} locale={locale} onVote={vote} onClose={() => setSelectedId(undefined)} /> : null}
  </View>;
}

export function HydrationReviewDialog({review, onVote, onClose, locale = 'pt-BR'}: {
  locale?: AppLocale;
  review: HydrationReview;
  onVote: (choice: 'valid' | 'invalid') => Promise<void>;
  onClose: () => void;
}): React.JSX.Element {
  const english = locale === 'en-US';
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [photoAttempt, setPhotoAttempt] = useState(0);
  const [error, setError] = useState<string>();
  const submit = async (choice: 'valid' | 'invalid') => {
    if (submitting.current || !photoLoaded || !review.can_vote) return;
    submitting.current = true;
    setBusy(true);
    setError(undefined);
    try {await onVote(choice);} catch (reason) {
      setError(reason instanceof AppError && reason.fields ? Object.values(reason.fields).flat()[0] ?? reason.message : reason instanceof Error ? reason.message : 'Não foi possível enviar seu voto.');
    } finally {submitting.current = false; setBusy(false);}
  };
  return <AppModal onRequestClose={onClose} dismissible={!busy}>
    <SafeAreaView style={styles.overlay}>
      <View style={styles.dialog}>
        <ScrollView contentContainerStyle={styles.dialogContent}>
          <Text accessibilityRole="header" style={styles.title}>{review.amount_ml} ml · {review.display_name}</Text>
          <Text style={styles.text}>{locale === 'es-ES' ? "¿La cantidad indicada corresponde al vaso o botella de la foto?" : english ? 'Does the reported volume match the glass or bottle in the photo?' : 'A quantidade informada é condizente com o copo ou garrafa da foto?'}</Text>
          {review.photo_path ? <Image key={photoAttempt} testID="hydration-review-photo" accessibilityLabel={locale === 'es-ES' ? "Foto del registro de agua" : english ? 'Water log photo' : 'Foto da marcação de água'}
            source={{uri: `${API_BASE_URL}${review.photo_path}`, headers: {Authorization: `Bearer ${secureTokenStore.getCached() ?? ''}`}, cache: 'reload'}}
            onLoad={() => {setPhotoLoaded(true); setPhotoError(false);}}
            onError={() => {setPhotoLoaded(false); setPhotoError(true);}}
            resizeMode="contain" style={styles.photo} /> : null}
          {!photoLoaded && !photoError ? <LoadingWaterDrop size={36} /> : null}
          {photoError ? <><Text accessibilityRole="alert" style={styles.error}>{locale === 'es-ES' ? "No se pudo cargar la foto. Comprueba la conexión antes de votar." : english ? 'The photo did not load. Check your connection before voting.' : 'A foto não carregou. Confira a conexão antes de votar.'}</Text><GroupButton label={locale === 'es-ES' ? "Volver a cargar la foto" : english ? 'Reload photo' : 'Recarregar foto'} secondary onPress={() => {setPhotoError(false); setPhotoAttempt(value => value + 1);}} /></> : null}
          <Text style={styles.text}>{statusLabel(review, locale)}. {english ? `${review.valid_votes} valid, ${review.invalid_votes} invalid, ${review.abstentions} abstentions.` : `${review.valid_votes} válido(s), ${review.invalid_votes} inválido(s), ${review.abstentions} sem voto.`}</Text>
          <Text style={styles.caption}>{english ? `${review.invalid_votes_required} invalid votes out of ${review.eligible_voters} people are required. Invalidated logs lose their water, XP and points, but stay in history.` : `São necessários ${review.invalid_votes_required} votos inválidos entre ${review.eligible_voters} pessoas. Ao anular, o registro perde o volume, XP e pontos que gerou, mas permanece no histórico.`}</Text>
          {review.expires_at ? <Text style={styles.caption}>{locale === 'es-ES' ? "Plazo: " : english ? 'Deadline: ' : 'Prazo: '}{new Date(review.expires_at).toLocaleString(locale)}</Text> : null}
          {review.your_vote ? <Text style={styles.text}>{locale === 'es-ES' ? "Tu voto: " : english ? 'Your vote: ' : 'Seu voto: '}{review.your_vote === 'valid' ? (locale === 'es-ES' ? "válido" : english ? 'valid' : 'válido') : (locale === 'es-ES' ? "inválido" : english ? 'invalid' : 'inválido')}.</Text> : null}
          {review.can_vote ? <>
            <GroupButton label={locale === 'es-ES' ? "La cantidad corresponde" : english ? 'The volume matches' : 'O volume é condizente'} disabled={!photoLoaded || busy} busy={busy} onPress={() => {submit('valid');}} />
            <GroupButton label={locale === 'es-ES' ? "La cantidad no corresponde" : english ? 'The volume does not match' : 'O volume não é condizente'} disabled={!photoLoaded || busy} busy={busy} secondary onPress={() => {submit('invalid');}} />
            <Text style={styles.caption}>{locale === 'es-ES' ? "El voto es definitivo. Revisa la foto antes de elegir." : english ? 'Your vote is final. Check the photo before choosing.' : 'O voto é definitivo. Confira a foto antes de escolher.'}</Text>
          </> : null}
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
          <GroupButton label={locale === 'es-ES' ? "Cerrar revisión" : english ? 'Close review' : 'Fechar revisão'} secondary disabled={busy} onPress={onClose} />
        </ScrollView>
      </View>
    </SafeAreaView>
  </AppModal>;
}

function statusLabel(review: HydrationReview, locale: AppLocale): string {
  if (locale === 'es-ES') return review.status === 'invalid' ? 'Registro anulado' : review.status === 'valid' ? 'Registro válido' : 'Válido durante la revisión';
  if (locale === 'en-US') return review.status === 'invalid' ? 'Log invalidated' : review.status === 'valid' ? 'Valid log' : 'Valid while under review';
  return review.status === 'invalid' ? 'Marcação anulada' : review.status === 'valid' ? 'Marcação válida' : 'Válida enquanto está em votação';
}

const styles = StyleSheet.create({
  panel: {padding: 20, gap: 14, borderRadius: 22, borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panel},
  title: {fontSize: 19, lineHeight: 26, fontWeight: '900', color: challengeTheme.colors.text},
  text: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.muted},
  caption: {fontSize: 12, lineHeight: 18, color: challengeTheme.colors.muted},
  row: {flexDirection: 'row', gap: 10, alignItems: 'center', borderTopWidth: 1, borderTopColor: challengeTheme.colors.border, paddingTop: 14},
  rowText: {flex: 1, gap: 4},
  avatar: {width: 38, height: 38, borderRadius: 19},
  name: {fontSize: 14, fontWeight: '800', color: challengeTheme.colors.text},
  link: {fontWeight: '800', color: challengeTheme.colors.cyanStrong},
  error: {fontSize: 13, lineHeight: 19, color: challengeTheme.colors.danger},
  pressed: {opacity: 0.75},
  overlay: {flex: 1, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: 'rgba(0, 10, 24, 0.85)'},
  dialog: {maxHeight: '90%', width: '100%', maxWidth: 460, alignSelf: 'center', borderRadius: 26, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, backgroundColor: challengeTheme.colors.background, overflow: 'hidden'},
  dialogContent: {padding: 20, gap: 14},
  photo: {width: '100%', height: 260, borderRadius: 14, backgroundColor: challengeTheme.colors.backgroundDeep},
});
