import React, {memo} from 'react';
import {Image, StyleSheet, Text, View, type TextStyle, type ViewStyle} from 'react-native';
import {getAvatarSource} from '../../../../shared/avatars/avatarOptions';
import {AqualinoIcon} from '../../../../shared/components/AqualinoIcon';
import {ChallengeAsset, type ChallengeAssetName} from './ChallengeAsset';
import {challengeTheme} from './challengeTheme';

interface Props {
  position: number;
  active?: boolean;
  medal?: ChallengeAssetName;
  barColor: string;
  avatarId?: string | null;
}

export const LeaderboardPlayer = memo(function LeaderboardPlayerView({position, active = false, medal, barColor, avatarId}: Props): React.JSX.Element {
  const progressStyle: ViewStyle = {backgroundColor: barColor, width: active ? '78%' : position <= 3 ? '58%' : '34%'};
  const rankLabelStyle: TextStyle = {color: barColor};

  return (
    <View style={styles.player}>
      <View style={styles.rank}>
        {medal ? (
          <>
            <ChallengeAsset name={medal} style={styles.medal} />
            <Text numberOfLines={1} style={[styles.rankLabel, rankLabelStyle]}>
              {position === 2 ? '2º lugar' : `${position}º`}
            </Text>
          </>
        ) : <Text style={styles.position}>{position}º</Text>}
      </View>
      <View style={[styles.avatarRing, active && styles.activeRing]}>
        {active
          ? <Image source={getAvatarSource(avatarId)} resizeMethod="resize" resizeMode="cover" style={styles.avatar} />
          : <AqualinoIcon name="plus" size={14} color="#E6F8FF" />}
      </View>
      <View style={styles.track}>
        <View style={[styles.progress, progressStyle]} />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  player: {flex: 1, minWidth: 0, alignItems: 'center'},
  rank: {height: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 1},
  medal: {width: 26, height: 29},
  rankLabel: {maxWidth: 36, fontSize: 8, lineHeight: 11, fontWeight: '900'},
  position: {fontSize: 14, lineHeight: 19, fontWeight: '900', color: challengeTheme.colors.muted},
  avatarRing: {
    width: 36, height: 36, borderRadius: 18, marginTop: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#416782', backgroundColor: '#113652',
  },
  activeRing: {
    borderColor: challengeTheme.colors.cyanStrong, shadowColor: challengeTheme.colors.cyan,
    shadowOpacity: 0.9, shadowRadius: 9, shadowOffset: {width: 0, height: 0}, elevation: 7,
  },
  avatar: {width: '100%', height: '100%'},
  track: {width: '78%', height: 5, marginTop: 6, borderRadius: 4, overflow: 'hidden', backgroundColor: '#103754'},
  progress: {height: '100%', borderRadius: 4},
});
