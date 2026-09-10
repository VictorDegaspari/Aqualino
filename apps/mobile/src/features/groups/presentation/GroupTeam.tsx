import React, {useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {PrivateGroup} from '@aqualino/contracts';
import {GroupSettings} from './GroupSettings';
import {GroupInvitation} from './GroupInvitation';
import {RaisedButton} from '../../../shared/components/RaisedButton';
import {SettingsIcon} from '../../../shared/components/SettingsIcon';
import {UserAvatar} from '../../../shared/avatars/UserAvatar';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import type {AppLocale} from '../../../shared/i18n/appLocale';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import type {GroupsCopy} from './groupsCopy';
import {LevelBadge} from '../../../shared/components/LevelBadge';
import {GroupChallengePanel} from '../../home/presentation/challenge/GroupChallengePanel';

export function GroupTeam({reviews, group, userId, copy, locale, busy, onShare, onRenew, onLeave, onPhotoReviewChange, onAutoRestartChange, onOpenMember}: {
  reviews?: React.ReactNode;
  onOpenMember?: (userId: string) => void;
  onAutoRestartChange?: (enabled: boolean) => Promise<boolean>;
  onPhotoReviewChange?: (enabled: boolean) => Promise<boolean>;
  group: PrivateGroup; userId?: string; copy: GroupsCopy; locale: AppLocale; busy: boolean;
  onShare: () => void; onRenew: () => void; onLeave: () => void;
}): React.JSX.Element {
  const [panel, setPanel] = useState<'settings' | 'invite' | null>(null);
  const availableSlots = Math.max(0, group.max_members - group.members.length);
  const t = (pt: string, en: string, es: string) => locale === 'en-US' ? en : locale === 'es-ES' ? es : pt;
  return (
    <>
      <View accessibilityElementsHidden={Boolean(panel)} importantForAccessibility={panel ? 'no-hide-descendants' : 'auto'} style={styles.content}>
        <View style={styles.summary}>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{t('Grupo', 'Group', 'Grupo')}</Text>
            <Text accessibilityRole="header" style={styles.title}>{group.name}</Text>
          </View>
          <RaisedButton testID="group-settings" label={t('Configurações do grupo', 'Group settings', 'Configuración del grupo')}
            iconOnly icon={<SettingsIcon size={24} color={challengeTheme.colors.text} />} tone="neutral" size="compact"
            onPress={() => setPanel('settings')} style={styles.settingsButton} />
        </View>

        <View style={styles.membersSection}>
          <View style={styles.membersHeader}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>{copy.members}</Text>
            <Text accessibilityLabel={copy.memberCount(group.members.length, group.max_members)} style={styles.count}>{group.members.length}/{group.max_members}</Text>
          </View>
          <View style={styles.members}>
            {group.members.map((member, index) => (
              <Pressable key={member.user_id} testID={`group-member-${member.user_id}`} accessibilityRole="button"
                accessibilityLabel={`${t('Ver perfil de', 'View profile of', 'Ver perfil de')} ${member.display_name}`}
                disabled={!onOpenMember} onPress={() => onOpenMember?.(member.user_id)}
                style={({pressed}) => [styles.member, index > 0 && styles.memberDivider, pressed && styles.pressed]}>
                <UserAvatar avatarId={member.avatar_url} style={styles.avatar} />
                <View style={styles.heading}>
                  <Text style={styles.name}>{member.display_name}{member.user_id === userId ? ` · ${copy.you}` : ''}</Text>
                  <View style={styles.memberDetails}>
                    <LevelBadge level={member.level ?? 1} locale={locale} />
                    {member.role === 'owner' ? <Text style={styles.caption}>{copy.owner}</Text> : null}
                  </View>
                </View>
                <Text accessible={false} style={styles.chevron}>›</Text>
              </Pressable>
            ))}
          </View>
          {!group.joining_closed && availableSlots > 0 ? (
            <View style={styles.invitation}>
              <Text style={styles.caption}>{t(`${availableSlots} ${availableSlots === 1 ? 'vaga disponível' : 'vagas disponíveis'}`, `${availableSlots} ${availableSlots === 1 ? 'spot available' : 'spots available'}`, `${availableSlots} ${availableSlots === 1 ? 'plaza disponible' : 'plazas disponibles'}`)}</Text>
              <Pressable testID="group-invite" accessibilityRole="button"
                onPress={() => setPanel('invite')} style={({pressed}) => [styles.inviteButton, pressed && styles.pressed]}>
                <AqualinoIcon name="plus" size={16} color={challengeTheme.colors.cyanStrong} />
                <Text style={styles.inviteLabel}>{t('Convidar', 'Invite', 'Invitar')}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <GroupChallengePanel locale={locale} challenge={group.challenge} result={group.previous_challenge} rules={group.challenge_rules} />
        {reviews}
        <Pressable testID="group-leave" accessibilityRole="button" disabled={busy} accessibilityState={{disabled: busy}}
          onPress={onLeave} style={({pressed}) => [styles.leaveButton, (pressed || busy) && styles.pressed]}>
          <Text style={styles.leaveLabel}>{copy.leave}</Text>
        </Pressable>
      </View>
      {panel === 'settings' ? <GroupSettings group={group} locale={locale} canEdit={group.owner_id === userId} busy={busy}
        onPhotoReviewChange={onPhotoReviewChange} onAutoRestartChange={onAutoRestartChange} onClose={() => setPanel(null)} /> : null}
      {panel === 'invite' ? <GroupInvitation group={group} locale={locale} canInvite={group.owner_id === userId} busy={busy}
        onShare={() => {setPanel(null); onShare();}} onRenew={() => {setPanel(null); onRenew();}} onClose={() => setPanel(null)} /> : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: {gap: 24},
  summary: {flexDirection: 'row', gap: 16, alignItems: 'center'},
  heading: {flex: 1, minWidth: 0, gap: 6},
  eyebrow: {fontSize: 12, lineHeight: 16, fontWeight: '700', color: challengeTheme.colors.muted},
  title: {fontSize: 28, lineHeight: 35, fontWeight: '900', color: challengeTheme.colors.text},
  settingsButton: {width: 48, flexShrink: 0},
  membersSection: {gap: 12},
  membersHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  sectionTitle: {fontSize: 18, lineHeight: 24, fontWeight: '800', color: challengeTheme.colors.text},
  count: {fontSize: 13, lineHeight: 18, color: challengeTheme.colors.muted},
  members: {borderRadius: 22, borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panel, overflow: 'hidden'},
  member: {flexDirection: 'row', gap: 14, alignItems: 'center', minHeight: 88, padding: 16},
  memberDivider: {borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: challengeTheme.colors.border},
  memberDetails: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8},
  avatar: {width: 56, height: 56, borderRadius: 28, backgroundColor: challengeTheme.colors.panelSoft},
  name: {fontSize: 17, lineHeight: 23, fontWeight: '800', color: challengeTheme.colors.text},
  caption: {fontSize: 12, lineHeight: 18, color: challengeTheme.colors.muted},
  chevron: {fontSize: 25, color: challengeTheme.colors.muted},
  invitation: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8},
  inviteButton: {minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8},
  inviteLabel: {fontSize: 14, fontWeight: '800', color: challengeTheme.colors.cyanStrong},
  pressed: {opacity: 0.65},
  leaveButton: {alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 12},
  leaveLabel: {fontSize: 14, color: challengeTheme.colors.danger, fontWeight: '700'},
});
