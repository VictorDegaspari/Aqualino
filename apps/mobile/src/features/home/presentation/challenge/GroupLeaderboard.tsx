import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {LeaderboardPlayer} from './LeaderboardPlayer';
import {challengeTheme} from './challengeTheme';

interface Props {
  displayName: string;
}

const players = [
  {position: 1, medal: 'rankGold' as const, color: '#FFBE20'},
  {position: 2, medal: 'rankSilver' as const, color: '#08D6DF'},
  {position: 3, medal: 'rankBronze' as const, color: '#D87943'},
  {position: 4, color: '#08BFCB'},
  {position: 5, color: '#31627E'},
];

export function GroupLeaderboard({displayName}: Props): React.JSX.Element {
  return (
    <View style={styles.panel}>
      <View style={styles.heading}>
        <Text style={styles.title}>Placar do grupo</Text>
        <Text numberOfLines={1} style={styles.name}>{displayName}</Text>
      </View>
      <View style={styles.players}>
        {players.map((player, index) => (
          <LeaderboardPlayer
            key={player.position}
            position={player.position}
            active={index === 0}
            medal={player.medal}
            barColor={player.color}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: 11, paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6,
    borderRadius: challengeTheme.radius.panel, borderWidth: 2, borderColor: challengeTheme.colors.border,
    backgroundColor: challengeTheme.colors.panel, shadowColor: '#00152C', shadowOpacity: 0.6,
    shadowRadius: 8, shadowOffset: {width: 0, height: 4}, elevation: 5,
  },
  heading: {height: 20, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 4},
  title: {fontSize: 16, lineHeight: 20, fontWeight: '900', color: challengeTheme.colors.text},
  name: {maxWidth: 105, fontSize: 10, lineHeight: 13, color: challengeTheme.colors.muted},
  players: {height: 76, marginTop: 1, flexDirection: 'row', alignItems: 'flex-end'},
});
