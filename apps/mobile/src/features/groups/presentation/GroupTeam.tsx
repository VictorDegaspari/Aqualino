import React from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import type {PrivateGroup} from '@aqualino/contracts';
import {getAvatarSource} from '../../../shared/avatars/avatarOptions';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import type {AppLocale} from '../../../shared/i18n/appLocale';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
import {GroupButton} from './GroupButton';
import type {GroupsCopy} from './groupsCopy';

export function GroupTeam({group, userId, copy, locale, busy, onShare, onRenew, onLeave}: {
  group: PrivateGroup; userId?: string; copy: GroupsCopy; locale: AppLocale; busy: boolean;
  onShare: () => void; onRenew: () => void; onLeave: () => void;
}): React.JSX.Element {
  const expired = group.invite ? Date.parse(group.invite.expires_at) <= Date.now() : false;
  const full = group.members.length >= group.max_members;
  return (
    <>
      <View style={styles.card}>
        <View style={styles.summary}>
          <View style={styles.groupIcon}><AqualinoIcon name="group" size={36} color={challengeTheme.colors.cyanStrong} /></View>
          <View style={styles.heading}>
            <Text style={styles.eyebrow}>{copy.active}</Text>
            <Text accessibilityRole="header" style={styles.title}>{group.name}</Text>
            <Text style={styles.description}>{copy.memberCount(group.members.length, group.max_members)}</Text>
          </View>
        </View>
        <Text style={styles.description}>{group.members.length < 2 ? copy.waiting : copy.together}</Text>
        <Text style={styles.caption}>{copy.timezone}: {group.timezone}</Text>
      </View>
      <View style={styles.card}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>{copy.members}</Text>
        {group.members.map(member => (
          <View key={member.user_id} style={styles.member}>
            <Image source={getAvatarSource(member.avatar_url)} style={styles.avatar} />
            <View style={styles.heading}>
              <Text style={styles.name}>{member.display_name}{member.user_id === userId ? ` · ${copy.you}` : ''}</Text>
              <Text style={styles.caption}>{member.role === 'owner' ? copy.owner : copy.member}</Text>
            </View>
            {member.role === 'owner' ? <AqualinoIcon name="star" size={21} color={challengeTheme.colors.gold} /> : null}
          </View>
        ))}
        {Array.from({length: Math.max(0, group.max_members - group.members.length)}, (_, index) => (
          <View key={`slot-${index}`} style={styles.member}>
            <View style={[styles.avatar, styles.emptyAvatar]}><AqualinoIcon name="plus" size={19} color={challengeTheme.colors.muted} /></View>
            <Text style={styles.description}>{copy.slot}</Text>
          </View>
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{copy.invite}</Text>
        {group.invite ? (
          <>
            <Text style={styles.description}>{copy.inviteHint}</Text>
            <Text selectable accessibilityLabel={`${copy.code}: ${group.invite.code}`} style={styles.code}>{group.invite.code}</Text>
            <Text style={styles.caption}>{expired ? copy.expired : copy.expires(new Date(group.invite.expires_at).toLocaleDateString(locale))}</Text>
            {full ? <Text style={styles.description}>{copy.full}</Text> : null}
            <GroupButton label={copy.share} onPress={onShare} disabled={busy || expired || full} />
            <GroupButton label={copy.renew} onPress={onRenew} secondary disabled={busy || full} />
          </>
        ) : <Text style={styles.description}>{full ? copy.full : copy.askOwner}</Text>}
      </View>
      <GroupButton label={copy.leave} onPress={onLeave} secondary disabled={busy} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {padding: 20, gap: 15, borderRadius: 22, borderWidth: 1, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panel},
  summary: {flexDirection: 'row', gap: 14, alignItems: 'center'}, heading: {flex: 1, gap: 4},
  groupIcon: {width: 66, height: 66, borderRadius: 22, backgroundColor: challengeTheme.colors.panelSoft, alignItems: 'center', justifyContent: 'center'},
  eyebrow: {fontSize: 10, letterSpacing: 1, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  title: {fontSize: 23, fontWeight: '900', color: challengeTheme.colors.text},
  sectionTitle: {fontSize: 18, fontWeight: '900', color: challengeTheme.colors.text},
  description: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.muted},
  caption: {fontSize: 12, lineHeight: 18, color: challengeTheme.colors.muted},
  member: {flexDirection: 'row', gap: 13, alignItems: 'center', minHeight: 52},
  avatar: {width: 46, height: 46, borderRadius: 23, backgroundColor: challengeTheme.colors.panelSoft},
  emptyAvatar: {alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, borderStyle: 'dashed'},
  name: {fontSize: 15, fontWeight: '800', color: challengeTheme.colors.text},
  code: {fontSize: 23, letterSpacing: 2, fontWeight: '900', color: challengeTheme.colors.cyanStrong, textAlign: 'center', paddingVertical: 14},
});
