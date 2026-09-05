import React, {useCallback, useEffect, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../app/navigation/AppNavigation';
import {ProfileAchievements} from '../../achievements/presentation/ProfileAchievements';
import {isAvatarId, type AvatarId} from '../../../shared/avatars/avatarOptions';
import {UserAvatar} from '../../../shared/avatars/UserAvatar';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {PencilIcon} from '../../../shared/components/PencilIcon';
import {TabScreenHeader} from '../../../shared/components/TabScreenHeader';
import {haptics} from '../../../shared/device/haptics';
import {useSessionStore} from '../../auth/application/sessionStore';
import {authRepository} from '../../auth/data/authRepository';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {AvatarPicker} from './AvatarPicker';
import {HydrationFlame} from '../../hydration/presentation/HydrationFlame';
import {useHydrationHomeData} from '../../hydration/presentation/useHydrationHome';
import {AppDialog} from '../../../shared/components/AppDialog';
import {LevelProgressCard} from './LevelProgressCard';

export function ProfileScreen({navigation}: NativeStackScreenProps<RootStackParamList, 'Profile'>): React.JSX.Element {
  const user = useSessionStore(state => state.user);
  const refreshUser = useSessionStore(state => state.refreshUser);
  const signOut = useSessionStore(state => state.signOut);
  const hydration = useHydrationHomeData();
  const savedAvatar = user?.profile.avatar_url;
  const currentAvatar = isAvatarId(savedAvatar) ? savedAvatar : null;
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarId | null>(currentAvatar);
  const [editingAvatar, setEditingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string>();

  useEffect(() => {setSelectedAvatar(currentAvatar);}, [currentAvatar, user?.id]);

  const openAvatarEditor = useCallback(() => {
    if (saving) return;

    haptics.selection();
    setEditingAvatar(true);
  }, [saving]);

  const closeAvatarEditor = useCallback(() => setEditingAvatar(false), []);

  const chooseAvatar = useCallback(async (avatarId: AvatarId) => {
    if (saving) return;

    haptics.selection();
    setEditingAvatar(false);

    if (avatarId === selectedAvatar) return;

    const previousAvatar = selectedAvatar;
    setSelectedAvatar(avatarId);
    setSaving(true);
    try {
      await authRepository.updateProfile({avatar_url: avatarId});
      await refreshUser();
      haptics.success();
    } catch (error) {
      setSelectedAvatar(previousAvatar);
      setAvatarError(error instanceof Error ? error.message : 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [refreshUser, saving, selectedAvatar]);

  return (
    <View style={styles.page}>
      <Image
        pointerEvents="none"
        source={require('../../../assets/challenge/static/ocean-background.webp')}
        resizeMode="cover"
        style={styles.background}
      />
      <View pointerEvents="none" style={styles.backgroundOverlay} />
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TabScreenHeader
            title="Perfil"
            subtitle="Sua jornada de hidratação em um só lugar."
            icon={<AqualinoIcon name="profile" size={34} color={challengeTheme.colors.cyanStrong} />}
          />
          <View style={styles.profileHeader}>
            <Pressable
              testID="profile-avatar"
              accessibilityRole="button"
              accessibilityLabel={selectedAvatar ? 'Editar avatar' : 'Escolher avatar'}
              accessibilityHint="Abre a seleção de avatares"
              disabled={saving}
              onPress={openAvatarEditor}
              style={({pressed}) => [styles.avatarEditor, pressed && !saving && styles.avatarEditorPressed]}>
              <View style={[styles.heroAvatarRing, !selectedAvatar && styles.emptyAvatarRing]}>
                <UserAvatar avatarId={selectedAvatar} style={styles.heroAvatar}>
                  <Text style={styles.chooseAvatarLabel}>Escolher avatar</Text>
                </UserAvatar>
              </View>
              <View style={styles.pencilBadge}><PencilIcon size={17} color={challengeTheme.colors.backgroundDeep} /></View>
            </Pressable>
            <Text accessibilityRole="header" style={styles.name}>{user?.profile.display_name ?? 'Aqualino'}</Text>
            <Text style={styles.username}>@{user?.profile.username ?? 'aqualino'}</Text>
            <View style={styles.stats}>
              <View style={styles.stat}>
                <AqualinoIcon name="star" size={18} color={challengeTheme.colors.gold} />
                <Text style={styles.statValue}>{user?.level ?? 1}</Text>
                <Text style={styles.statLabel}>nível</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <HydrationFlame totalMl={hydration.data?.data.today.total_ml ?? 0} size={18} />
                <Text style={styles.statValue}>{user?.streak ?? 0}</Text>
                <Text style={styles.statLabel}>dias</Text>
              </View>
            </View>
          </View>

          {user?.level_progress ? <LevelProgressCard level={user.level ?? 1} progress={user.level_progress} multiplier={user.xp_multiplier} /> : null}

          {editingAvatar ? (
            <AvatarPicker
              disabled={saving}
              selectedAvatar={selectedAvatar}
              onClose={closeAvatarEditor}
              onSelect={chooseAvatar}
            />
          ) : null}

          <View style={styles.collectionPanel}>
            <View style={styles.collectionHeader}>
              <View>
                <Text style={styles.collectionTitle}>Medalhas</Text>
                <Text style={styles.collectionSubtitle}>Suas premiações nos desafios em grupo.</Text>
              </View>
              <AqualinoIcon name="trophySilver" size={29} color={challengeTheme.colors.cyanStrong} />
            </View>
            <View style={styles.medals}>
              <Medal name="medalGold" label="Ouro" />
              <Medal name="medalSilver" label="Prata" />
              <Medal name="medalBronze" label="Bronze" />
            </View>
            <Text style={styles.collectionNotice}>Conclua desafios de grupo para conquistar medalhas.</Text>
          </View>

          <ProfileAchievements onOpen={() => navigation.navigate('Achievements')} />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
            onPress={signOut}
            style={({pressed}) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}>
            <AqualinoIcon name="logout" size={18} color={challengeTheme.colors.danger} />
            <Text style={styles.signOutLabel}>Sair da conta</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
      {avatarError ? <AppDialog title="Não foi possível salvar seu avatar" message={avatarError} icon="profile" onClose={() => setAvatarError(undefined)} /> : null}
    </View>
  );
}

function Medal({name, label}: {name: 'medalGold' | 'medalSilver' | 'medalBronze'; label: string}): React.JSX.Element {
  return (
    <View style={styles.medal}>
      <View style={styles.medalIcon}><AqualinoIcon name={name} size={35} /></View>
      <Text style={styles.medalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {flex: 1, backgroundColor: challengeTheme.colors.background},
  background: {position: 'absolute', width: '100%', height: '100%', opacity: 0.72},
  backgroundOverlay: {position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0, 13, 32, 0.54)'},
  safeArea: {flex: 1},
  scroll: {flex: 1},
  content: {paddingHorizontal: 24, paddingVertical: 30, gap: 26},
  profileHeader: {alignItems: 'center'},
  avatarEditor: {position: 'relative'},
  avatarEditorPressed: {opacity: 0.88, transform: [{scale: 0.97}]},
  heroAvatarRing: {
    width: 116, height: 116, borderRadius: 58, padding: 5, overflow: 'hidden', backgroundColor: challengeTheme.colors.cyanStrong,
    shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: {width: 0, height: 2}, elevation: 10,
  },
  heroAvatar: {width: '100%', height: '100%', borderRadius: 52},
  emptyAvatarRing: {backgroundColor: challengeTheme.colors.panelSoft, borderWidth: 1, borderStyle: 'dashed', borderColor: challengeTheme.colors.borderStrong, shadowOpacity: 0, elevation: 0},
  chooseAvatarLabel: {maxWidth: 76, textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '700', color: challengeTheme.colors.cyanStrong},
  pencilBadge: {position: 'absolute', right: -4, bottom: -2, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: challengeTheme.colors.cyanStrong, borderWidth: 3, borderColor: challengeTheme.colors.background, shadowColor: challengeTheme.colors.cyan, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: {width: 0, height: 2}, elevation: 7},
  name: {marginTop: 13, fontSize: 27, lineHeight: 34, fontWeight: '900', color: challengeTheme.colors.text},
  username: {marginTop: 2, fontSize: 14, lineHeight: 20, color: challengeTheme.colors.muted},
  stats: {flexDirection: 'row', alignItems: 'center', marginTop: 17, borderRadius: challengeTheme.radius.pill, backgroundColor: challengeTheme.colors.panelSoft, borderWidth: 1, borderColor: challengeTheme.colors.border},
  stat: {minWidth: 104, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 10},
  statDivider: {width: 1, height: 24, backgroundColor: challengeTheme.colors.border},
  statValue: {fontSize: 16, lineHeight: 20, fontWeight: '900', color: challengeTheme.colors.text},
  statLabel: {fontSize: 12, lineHeight: 16, color: challengeTheme.colors.muted},
  collectionPanel: {padding: 18, borderRadius: challengeTheme.radius.panel, backgroundColor: challengeTheme.colors.panel, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong},
  collectionHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14},
  collectionTitle: {fontSize: 20, lineHeight: 26, fontWeight: '900', color: challengeTheme.colors.text},
  collectionSubtitle: {marginTop: 2, fontSize: 13, lineHeight: 18, color: challengeTheme.colors.muted},
  medals: {flexDirection: 'row', justifyContent: 'space-between', marginTop: 18},
  medal: {alignItems: 'center', gap: 5, width: '30%'},
  medalIcon: {width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: challengeTheme.colors.panelSoft, borderWidth: 1, borderColor: challengeTheme.colors.border},
  medalLabel: {fontSize: 12, lineHeight: 16, fontWeight: '800', color: challengeTheme.colors.muted},
  collectionNotice: {marginTop: 13, textAlign: 'center', fontSize: 12, lineHeight: 17, color: '#B4D5E7'},
  signOutButton: {minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: challengeTheme.radius.pill, borderWidth: 1, borderColor: 'rgba(255, 119, 137, 0.54)', backgroundColor: 'rgba(166, 42, 63, 0.16)'},
  signOutButtonPressed: {opacity: 0.76, transform: [{scale: 0.985}]},
  signOutLabel: {fontSize: 15, lineHeight: 20, fontWeight: '900', color: challengeTheme.colors.danger},
});
