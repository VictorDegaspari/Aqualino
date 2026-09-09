import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {useInfiniteQuery, useQueryClient} from '@tanstack/react-query';
import {useIsFocused} from '@react-navigation/native';
import type {HydrationReview, HydrationReviewPage} from '@aqualino/contracts';
import {apiRequest} from '../../../shared/api/apiClient';
import {LoadingWaterDrop} from '../../../shared/components/LoadingWaterDrop';
import {useSessionStore} from '../../auth/application/sessionStore';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {GroupButton} from './GroupButton';
import {HydrationReviewCard} from './HydrationReviewCard';
import type {AppLocale} from '../../../shared/i18n/appLocale';

export function HydrationReviews({groupId, memberCount, reviewEnabled = true, locale = 'pt-BR'}: {groupId: string; memberCount: number; reviewEnabled?: boolean; locale?: AppLocale}): React.JSX.Element {
  const english = locale === 'en-US';
  const userId = useSessionStore(state => state.user?.id);
  const refreshUser = useSessionStore(state => state.refreshUser);
  const focused = useIsFocused();
  const queryClient = useQueryClient();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const query = useInfiniteQuery({
    queryKey: ['groups', userId, groupId, 'reviews'],
    queryFn: ({pageParam, signal}) => apiRequest<HydrationReviewPage>(`/groups/current/reviews?page=${pageParam}`, {signal, unwrapData: false}),
    initialPageParam: 1,
    getNextPageParam: page => page.meta.current_page < page.meta.last_page ? page.meta.current_page + 1 : undefined,
    enabled: Boolean(userId) && focused,
    refetchInterval: focused ? 30_000 : false,
  });
  const reviews = query.data?.pages.flatMap(page => page.data) ?? [];
  const votableReviews = reviews.filter(review => review.can_vote && !dismissedIds.includes(review.id));
  const current = votableReviews[0];
  const next = votableReviews[1];
  const vote = async (review: HydrationReview, choice: 'valid' | 'invalid') => {
    await apiRequest<HydrationReview>(`/hydration/logs/${review.id}/votes`, {method: 'POST', body: {vote: choice}, timeoutMs: 15_000});
    refreshUser().catch(() => undefined);
  };
  const pendingLabel = locale === 'es-ES' ? 'Tienes registros para revisar' : english ? 'You have logs to review' : 'Você tem marcações para conferir';

  return <View testID="group-hydration-reviews" style={styles.panel}>
    <Text accessibilityRole="header" style={styles.title}>{locale === 'es-ES' ? 'Votar registros' : english ? 'Vote on logs' : 'Votar marcações'}</Text>
    {!reviewEnabled ? <Text style={styles.text}>{locale === 'es-ES' ? 'El líder desactivó la votación para los nuevos envíos. Las votaciones ya abiertas siguen disponibles.' : english ? 'The leader disabled voting for new submissions. Open votes remain available.' : 'O líder desabilitou a votação para novos envios. As votações já abertas continuam disponíveis.'}</Text> : memberCount <= 2 ? <Text style={styles.text}>{locale === 'es-ES' ? 'La votación se activa con al menos 3 personas en el grupo.' : english ? 'Voting activates with at least 3 people in the group.' : 'A votação é ativada com pelo menos 3 pessoas no grupo.'}</Text> : <Text style={styles.text}>{locale === 'es-ES' ? 'Arrastra a la derecha si el volumen corresponde a la foto. Arrastra a la izquierda si no corresponde.' : english ? 'Swipe right when the reported volume matches the photo. Swipe left when it does not.' : 'Arraste para a direita se o volume corresponde à foto. Para a esquerda se não corresponde.'}</Text>}
    {query.isPending ? <LoadingWaterDrop accessibilityLabel={locale === 'es-ES' ? 'Cargando registros para votar' : english ? 'Loading logs to vote on' : 'Carregando marcações para votar'} size={44} /> : null}
    {query.isError ? <><Text accessibilityRole="alert" style={styles.error}>{locale === 'es-ES' ? 'No se pudieron actualizar los registros.' : english ? 'Could not refresh the logs.' : 'Não foi possível atualizar as marcações.'}</Text><GroupButton label={locale === 'es-ES' ? 'Intentar de nuevo' : english ? 'Try again' : 'Tentar novamente'} onPress={() => {query.refetch();}} secondary /></> : null}
    {!query.isPending && !query.isError && current ? <>
      <Text accessibilityLiveRegion="polite" style={styles.counter}>{pendingLabel} · {votableReviews.length}</Text>
      <View style={styles.deck}>
        {next ? <View pointerEvents="none" style={styles.nextCard} /> : null}
        <HydrationReviewCard key={current.id} review={current} locale={locale} onVote={choice => vote(current, choice)} onDismiss={() => {
          setDismissedIds(ids => [...ids, current.id]);
          queryClient.invalidateQueries({queryKey: ['groups']});
          queryClient.invalidateQueries({queryKey: ['hydration']});
        }} />
      </View>
    </> : null}
    {!query.isPending && !query.isError && !current ? <Text style={styles.empty}>{reviews.length > 0 ? (locale === 'es-ES' ? 'No hay registros pendientes de tu voto.' : english ? 'There are no logs waiting for your vote.' : 'Não há marcações aguardando seu voto.') : (locale === 'es-ES' ? 'No hay registros para revisar por ahora.' : english ? 'There are no logs to review yet.' : 'Nenhuma marcação para conferir por enquanto.')}</Text> : null}
    {query.hasNextPage ? <GroupButton label={locale === 'es-ES' ? 'Cargar más registros' : english ? 'Load more logs' : 'Carregar mais marcações'} onPress={() => {query.fetchNextPage();}} busy={query.isFetchingNextPage} secondary /> : null}
  </View>;
}

const styles = StyleSheet.create({
  panel: {padding: 20, gap: 14, borderRadius: 22, borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panel},
  title: {fontSize: 19, lineHeight: 26, fontWeight: '900', color: challengeTheme.colors.text},
  text: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.muted},
  counter: {fontSize: 12, lineHeight: 17, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  deck: {height: 424, paddingTop: 10},
  nextCard: {position: 'absolute', top: 18, right: 9, left: 9, height: 400, borderRadius: 26, backgroundColor: challengeTheme.colors.panelSoft, transform: [{scale: 0.97}]},
  empty: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.muted},
  error: {fontSize: 13, lineHeight: 19, color: challengeTheme.colors.danger},
});
