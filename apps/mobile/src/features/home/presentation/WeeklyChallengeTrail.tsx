import type {HydrationWeek, HydrationWeekDay, HydrationWeekDayState} from '@aqualino/contracts';
import {tokens} from '@aqualino/design-tokens';
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

interface Props {
  week: HydrationWeek;
}

const weekdayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
const stateContent: Record<HydrationWeekDayState, {icon: string; label: string}> = {
  future: {icon: '○', label: 'Futuro'},
  no_record: {icon: '＋', label: 'Sem registro'},
  in_progress: {icon: '≈', label: 'Em progresso'},
  goal_achieved: {icon: '✓', label: 'Meta atingida'},
  missed: {icon: '!', label: 'Meta perdida'},
};

export function WeeklyChallengeTrail({week}: Props): React.JSX.Element {
  return (
    <View style={styles.card}>
      <CoralDecoration />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>DESAFIO SEMANAL</Text>
          <Text accessibilityRole="header" style={styles.title}>Seu caminho de 7 dias</Text>
          <Text style={styles.range}>{formatDate(week.starts_on)} — {formatDate(week.ends_on)} · {week.timezone}</Text>
        </View>
        <View accessibilityLabel={`${week.completed_goal_days} de 7 metas atingidas`} style={styles.score}>
          <Text style={styles.scoreValue}>{week.completed_goal_days}/7</Text>
          <Text style={styles.scoreLabel}>metas</Text>
        </View>
      </View>

      <View style={styles.trail}>
        {week.days.map((day, index) => (
          <React.Fragment key={day.date}>
            <TrailDay day={day} index={index} />
            {index < week.days.length - 1 ? (
              <View style={[styles.connector, index % 2 === 0 ? styles.connectorRight : styles.connectorLeft]} />
            ) : null}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function TrailDay({day, index}: {day: HydrationWeekDay; index: number}): React.JSX.Element {
  const content = stateContent[day.state];
  const progress = day.total_ml > 0 ? `${day.total_ml} de ${day.goal_ml} ml` : content.label;
  const protection = day.protection === 'streak_freeze'
    ? 'Protegido por congelamento'
    : day.protection === 'streak_revive'
      ? 'Recuperado por poção'
      : undefined;

  return (
    <View
      accessibilityLabel={`${weekdayLabels[index]}, ${formatDate(day.date)}: ${content.label}, ${progress}${protection ? `, ${protection}` : ''}`}
      style={[styles.dayRow, index % 2 === 0 ? styles.dayLeft : styles.dayRight]}>
      <View style={styles.dayCopy}>
        <Text style={styles.weekday}>{weekdayLabels[index]} · {formatDate(day.date)}</Text>
        <Text style={styles.dayProgress}>{progress}</Text>
        {protection ? <Text style={styles.protection}>{protection}</Text> : null}
      </View>
      <View
        style={[
          styles.node,
          styles[`node_${day.state}`],
          day.is_today && styles.nodeToday,
          day.is_trophy && styles.trophy,
        ]}>
        <Text style={[styles.nodeIcon, day.state === 'future' && styles.nodeIconMuted]}>
          {day.is_trophy ? '🏆' : content.icon}
        </Text>
        {day.is_today ? <Text style={styles.todayLabel}>HOJE</Text> : null}
      </View>
    </View>
  );
}

function CoralDecoration(): React.JSX.Element {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none" style={styles.coral}>
      <View style={[styles.coralBranch, styles.coralOrange]} />
      <View style={[styles.coralBranch, styles.coralPink]} />
      <View style={[styles.coralBranch, styles.coralPurple]} />
      <View style={[styles.coralDot, styles.coralYellow]} />
    </View>
  );
}

function formatDate(date: string): string {
  const [, month, day] = date.split('-');

  return `${day}/${month}`;
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: tokens.radius.lg,
    backgroundColor: '#073E49',
    padding: tokens.spacing.lg,
    gap: tokens.spacing.lg,
  },
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12},
  eyebrow: {fontSize: 12, fontWeight: '900', color: '#79E6D6', letterSpacing: 1.2},
  title: {fontSize: tokens.fontSize.lg, fontWeight: '900', color: '#FFFFFF', marginTop: 4},
  range: {fontSize: 12, color: '#B8DDE1', marginTop: 5, maxWidth: 230},
  score: {minWidth: 58, borderRadius: tokens.radius.md, backgroundColor: '#0C5964', padding: 8, alignItems: 'center'},
  scoreValue: {fontSize: tokens.fontSize.lg, color: '#FFFFFF', fontWeight: '900'},
  scoreLabel: {fontSize: 11, color: '#B8DDE1'},
  trail: {paddingVertical: tokens.spacing.sm},
  dayRow: {width: '88%', flexDirection: 'row', alignItems: 'center', gap: tokens.spacing.sm},
  dayLeft: {alignSelf: 'flex-start', flexDirection: 'row-reverse'},
  dayRight: {alignSelf: 'flex-end'},
  dayCopy: {flex: 1},
  weekday: {color: '#FFFFFF', fontSize: tokens.fontSize.sm, fontWeight: '900'},
  dayProgress: {color: '#B8DDE1', fontSize: 12, marginTop: 2},
  protection: {color: '#7FE7FF', fontSize: 11, fontWeight: '800', marginTop: 2},
  node: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001E24',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: {width: 0, height: 4},
    elevation: 4,
  },
  node_future: {backgroundColor: '#315A61', borderColor: '#56757A'},
  node_no_record: {backgroundColor: '#0E7885', borderColor: '#41C5D2'},
  node_in_progress: {backgroundColor: '#0B8F91', borderColor: '#64E2D4'},
  node_goal_achieved: {backgroundColor: '#16A781', borderColor: '#74F0BE'},
  node_missed: {backgroundColor: '#714552', borderColor: '#D98A9D'},
  nodeToday: {borderColor: '#FFE277', borderWidth: 5},
  nodeIcon: {fontSize: 28, fontWeight: '900', color: '#FFFFFF'},
  nodeIconMuted: {color: '#A6BEC2'},
  todayLabel: {fontSize: 9, color: '#FFE277', fontWeight: '900', marginTop: -2},
  trophy: {width: 80, height: 72, borderRadius: 20},
  connector: {width: 44, height: 22, borderBottomWidth: 4, borderColor: '#197582', alignSelf: 'center'},
  connectorRight: {transform: [{rotate: '22deg'}], marginLeft: 16},
  connectorLeft: {transform: [{rotate: '-22deg'}], marginRight: 16},
  coral: {position: 'absolute', right: -12, bottom: 4, width: 70, height: 100},
  coralBranch: {position: 'absolute', width: 13, borderRadius: 8, bottom: 0},
  coralOrange: {height: 72, right: 15, backgroundColor: '#F26B3A', transform: [{rotate: '16deg'}]},
  coralPink: {height: 54, right: 38, backgroundColor: '#F05A94', transform: [{rotate: '-18deg'}]},
  coralPurple: {height: 42, right: 2, backgroundColor: '#9B5DE5', transform: [{rotate: '34deg'}]},
  coralDot: {position: 'absolute', width: 15, height: 15, borderRadius: 8, right: 44, bottom: 48},
  coralYellow: {backgroundColor: '#F6C445'},
});
