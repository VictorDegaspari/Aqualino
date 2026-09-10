import React, {useEffect, useState, useCallback} from 'react';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions} from 'react-native';
import {useIsFocused} from '@react-navigation/native';
import {SwipeBackScreen} from '../../../shared/components/SwipeBackScreen';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {Achievement, PersonProfile} from '@aqualino/contracts';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {useTranslation} from '../../../shared/i18n/useTranslation';
import {UserAvatar} from '../../../shared/avatars/UserAvatar';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {useOnboardingPreferencesStore} from '../../onboarding/application/onboardingPreferencesStore';
import {AchievementMedal} from '../../achievements/presentation/AchievementMedal';
import {AchievementModal} from '../../achievements/presentation/AchievementModal';
import {achievementCopy} from '../../achievements/presentation/achievementCopy';
import {profileAchievements} from '../../achievements/application/achievementCatalog';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {useFriendshipActions, usePersonProfile} from './useFriendships';
import {ProfileWeeklyHydration} from './ProfileWeeklyHydration';
import {FriendshipButtons} from './FriendshipButtons';
import {friendshipStyles as styles} from './friendshipStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'PersonProfile'>;
export function PersonProfileScreen({navigation, route}: Props): React.JSX.Element {
  const focused = useIsFocused();
  const onBack = useCallback(() => navigation.goBack(), [navigation]);
  const {t} = useTranslation();
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const query = usePersonProfile(route.params?.userId ?? '');
  const actions = useFriendshipActions();
  const [selected, setSelected] = useState<Achievement | null>(null);
  useEffect(() => {setSelected(null);}, [route.params?.userId]);
  return <SwipeBackScreen testID="person-profile" active={focused} onBack={onBack}>{close => <SafeAreaView style={styles.page}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel={t('Voltar', 'Back', 'Volver')} testID="person-profile-back" onPress={close} style={styles.back}><Text style={styles.backLabel}>‹</Text></Pressable><Text accessibilityRole="header" style={styles.title}>{t('Perfil', 'Profile', 'Perfil')}</Text></View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl tintColor={challengeTheme.colors.cyanStrong} refreshing={query.isRefetching} onRefresh={() => {query.refetch();}} />}>
      {query.isPending ? <ActivityIndicator color={challengeTheme.colors.cyanStrong} /> : null}
      {query.isError ? <View style={styles.panel}><Text accessibilityRole="alert" style={styles.error}>{t('Não foi possível abrir este perfil. Ele pode estar indisponível.', 'Could not open this profile. It may be unavailable.', 'No se pudo abrir este perfil. Puede no estar disponible.')}</Text><RaisedButton onPress={() => query.refetch()} label={t('Tentar novamente', 'Try again', 'Intentar de nuevo')} variant="outlined" tone="aqua" /></View> : null}
      {query.data ? <>
        <PersonProfileView person={query.data} onSelect={setSelected} actions={<FriendshipButtons status={query.data.relationship} busy={actions.isPending} onAction={action => actions.mutate({personId: query.data!.id, action})} />} />
        {actions.isError ? <Text accessibilityRole="alert" style={styles.error}>{t('Não foi possível atualizar a amizade. Tente novamente.', 'Could not update the friendship. Please try again.', 'No se pudo actualizar la amistad. Inténtalo de nuevo.')}</Text> : null}
      </> : null}
    </ScrollView>
    {selected ? <AchievementModal achievement={selected} copy={achievementCopy[locale]} locale={locale} onClose={() => setSelected(null)} /> : null}
  </SafeAreaView>}</SwipeBackScreen>;
}

export function PersonProfileView({person, onSelect, actions}: {person: PersonProfile; actions?: React.ReactNode; onSelect: (achievement: Achievement) => void}): React.JSX.Element {
  const {t} = useTranslation();
  const locale = useOnboardingPreferencesStore(state => state.locale);
  const copy = achievementCopy[locale];
  const {width, fontScale} = useWindowDimensions();
  const columns = fontScale > 1.6 ? 1 : width < 350 || fontScale > 1.2 ? 2 : 3;
  const medalWidth = (width - 40 - (columns - 1) * 12) / columns;
  const renderAchievement = (item: Achievement) => <Pressable key={item.code} accessibilityRole="button" accessibilityLabel={copy.items[item.code].title} onPress={() => onSelect(item)} style={[styles.achievement, {width: medalWidth}]}>
    <AchievementMedal achievement={item} size={Math.min(104, medalWidth)} />
    <Text style={styles.achievementTitle}>{copy.items[item.code].title}</Text>
  </Pressable>;
  return <>
    <View style={styles.hero}><UserAvatar avatarId={person.avatar_url} style={styles.heroAvatar} />
      <Text accessibilityRole="header" style={styles.title}>{person.display_name}</Text><Text style={styles.muted}>@{person.username} · {t('Nível', 'Level', 'Nivel')} {person.level}</Text>
    </View>
    {actions}
    {person.hydration_week ? <ProfileWeeklyHydration week={person.hydration_week} /> : null}
    <View style={styles.panel}><Text accessibilityRole="header" style={styles.heading}>{t('Medalhas', 'Medals', 'Medallas')}</Text>
      <View style={styles.medals}>{(['gold', 'silver', 'bronze'] as const).map(medal => <View key={medal} style={styles.medal}>
        <AqualinoIcon name={medal === 'gold' ? 'medalGold' : medal === 'silver' ? 'medalSilver' : 'medalBronze'} size={42} />
        <Text style={styles.achievementTitle}>{person.group_medals[medal]} × {medal === 'gold' ? t('Ouro', 'Gold', 'Oro') : medal === 'silver' ? t('Prata', 'Silver', 'Plata') : t('Bronze', 'Bronze', 'Bronce')}</Text>
      </View>)}</View>
    </View>
    {person.profile_highlights.length ? <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{t('Destaques do perfil', 'Profile highlights', 'Destacados del perfil')}</Text><View style={styles.grid}>{profileAchievements(person.achievements, person.profile_highlights).map(renderAchievement)}</View></View> : null}
    <View style={styles.section}><Text accessibilityRole="header" style={styles.heading}>{copy.title} · {person.achievements.length}</Text>
      {person.achievements.length ? <View style={styles.grid}>{person.achievements.map(renderAchievement)}</View> : <Text style={styles.muted}>{t('As conquistas aparecerão aqui.', 'Achievements will appear here.', 'Los logros aparecerán aquí.')}</Text>}
    </View>
  </>;
}
