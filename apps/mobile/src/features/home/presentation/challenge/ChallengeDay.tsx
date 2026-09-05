import type {HydrationWeekDay} from '@aqualino/contracts';
import React, {memo, useMemo} from 'react';
import {Pressable, StyleSheet, Text, View, type ImageStyle, type ViewStyle} from 'react-native';
import {AqualinoIcon} from '../../../../shared/components/AqualinoIcon';
import {ChallengeAsset, type ChallengeAssetName} from './ChallengeAsset';
import {CurrentWaterDrop} from './CurrentWaterDrop';
import {WaterProgress} from './WaterProgress';
import {dayNodes, dayStateLabels, timelineLayout, weekdayLabels} from './challengeTheme';

interface Props {
  day: HydrationWeekDay;
  index: number;
  scale: number;
  motionEnabled?: boolean;
  onPress: (day: HydrationWeekDay, index: number) => void;
}

const stateAssets: Record<HydrationWeekDay['state'], ChallengeAssetName> = {
  future: 'dayLocked',
  no_record: 'dayEmpty',
  in_progress: 'dayProgress',
  goal_achieved: 'dayCompleted',
  missed: 'dayMissed',
};

export const ChallengeDay = memo(function ChallengeDayView({day, index, scale, motionEnabled = true, onPress}: Props): React.JSX.Element {
  const content = dayStateLabels[day.state];
  const dayProgress = day.total_ml > 0
    ? `${formatNumber(day.total_ml)} de ${formatNumber(day.goal_ml)} ml`
    : content;
  const protection = day.protection === 'streak_freeze'
    ? 'Protegido por congelamento'
    : day.protection === 'streak_revive'
      ? 'Recuperado por poção'
      : undefined;
  const accessibilityLabel = `${weekdayLabels[day.weekday - 1]}, ${formatDate(day.date)}: ${content}, ${dayProgress}${protection ? `, ${protection}` : ''}`;
  const layout = useMemo(() => createLayout(index, scale, day), [day, index, scale]);

  return (
    <View pointerEvents="box-none" style={[styles.layer, layout.layer]}>
      <View pointerEvents="none" style={layout.label}>
        <View style={styles.dayLabel}>
          <Text style={[styles.weekday, day.is_today && styles.todayLabel]}>{weekdayLabels[day.weekday - 1]}</Text>
          {day.is_today ? <AqualinoIcon name="play" size={12} color="#B9F3F5" /> : null}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Abre os detalhes de hidratação deste dia"
        onPress={() => onPress(day, index)}
        style={({pressed}) => [layout.nodeTouch, pressed && styles.pressed]}>
        {day.is_today ? (
          <CurrentWaterDrop scale={scale} totalMl={day.total_ml} goalMl={day.goal_ml} motionEnabled={motionEnabled} />
        ) : (
          <ChallengeAsset name={stateAssets[day.state]} style={layout.markerImage} />
        )}
      </Pressable>

      {day.is_today ? (
        <View pointerEvents="none" style={layout.progress}>
          <WaterProgress current={day.total_ml} goal={day.goal_ml} percentage={day.percentage} compact={scale < 1} />
        </View>
      ) : null}
    </View>
  );
});

function createLayout(index: number, scale: number, day: HydrationWeekDay): {
  layer: ViewStyle;
  label: ViewStyle;
  nodeTouch: ViewStyle;
  markerImage: ImageStyle;
  progress: ViewStyle;
} {
  const node = dayNodes[index] ?? dayNodes[dayNodes.length - 1];
  const nodeX = node.x * scale;
  const nodeY = node.y * scale;
  const markerWidth = 72 * scale;
  const markerHeight = 84 * scale;
  const currentWidth = 120 * scale;
  const currentHeight = 147 * scale;
  const labelTop = (node.y - (day.is_today ? 80 : 58)) * scale;

  const visual = day.is_today
    ? {width: currentWidth, height: currentHeight, top: nodeY - currentHeight * 0.84}
    : {width: markerWidth, height: markerHeight, top: nodeY - markerHeight * 0.82};

  return {
    layer: {zIndex: day.is_today ? 10 : index + 1},
    label: {
      position: 'absolute', left: timelineLayout.labelLeft * scale, top: labelTop,
      width: timelineLayout.labelWidth * scale, minHeight: 44, flexDirection: 'row',
      alignItems: 'center', justifyContent: 'flex-end', gap: 6,
    },
    nodeTouch: {
      position: 'absolute', left: nodeX - visual.width / 2, top: visual.top,
      width: visual.width, height: visual.height, alignItems: 'center', overflow: 'visible',
    },
    markerImage: {width: markerWidth, height: markerHeight},
    progress: {
      position: 'absolute', left: timelineLayout.statsLeft * scale,
      top: (node.y - 85) * scale, width: timelineLayout.statsWidth * scale,
      minHeight: 78, justifyContent: 'center',
    },
  };
}

function formatDate(date: string): string {
  const [, month, day] = date.split('-');
  return `${day}/${month}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('pt-BR');
}

const styles = StyleSheet.create({
  layer: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0},
  pressed: {opacity: 0.82, transform: [{scale: 0.975}]},
  dayLabel: {
    flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 9,
    backgroundColor: 'rgba(2, 23, 38, 0.42)',
  },
  weekday: {
    fontSize: 14, lineHeight: 18, textAlign: 'right', fontWeight: '800', color: '#E6F5F8',
    textShadowColor: 'rgba(0, 10, 18, 0.95)', textShadowRadius: 4, textShadowOffset: {width: 0, height: 1},
  },
  todayLabel: {fontSize: 18, lineHeight: 23, color: '#D4FEFF', fontWeight: '900'},
});
