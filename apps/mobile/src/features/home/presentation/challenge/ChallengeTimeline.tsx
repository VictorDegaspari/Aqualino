import type {ChallengeReward, HydrationWeek, HydrationWeekDay} from '@aqualino/contracts';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  RefreshControl,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ScrollViewInstance,
  type ViewStyle,
} from 'react-native';
import {ChallengeBubbles} from './ChallengeBubbles';
import {ChallengeDay} from './ChallengeDay';
import {type ChallengeMode} from './ChallengeModeToggle';
import {RewardChestIcon} from './RewardChestIcon';
import {ChallengePath} from './ChallengePath';
import {DayDetailsModal} from './DayDetailsModal';
import {challengeCanvasHeight, challengeTheme, dayNodes, timelineLayout} from './challengeTheme';
import {haptics} from '../../../../shared/device/haptics';

const SCENE_TOP_SPACE = 68;

interface Props {
  week: HydrationWeek;
  mode: ChallengeMode;
  reward?: ChallengeReward | null;
  onReward?: () => void;
  motionEnabled?: boolean;
  refreshing?: boolean;
  onRefresh: () => void;
}

export function ChallengeTimeline({week, mode, reward, onReward, motionEnabled = true, refreshing = false, onRefresh}: Props): React.JSX.Element {
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [selected, setSelected] = useState<{day: HydrationWeekDay; index: number}>();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const positionedChallenge = useRef('');
  const {width} = useWindowDimensions();
  const scale = Math.min(1.06, Math.max(0.9, (width - 32) / challengeTheme.canvasWidth));
  const currentIndex = Math.max(0, week.days.findIndex(day => day.is_today));
  const challengeKey = `${week.starts_on}:${week.ends_on}:${week.current_date}`;
  const layout = useMemo(() => createLayout(scale), [scale]);

  useEffect(() => {
    if (viewportHeight <= 0 || contentHeight <= 0 || positionedChallenge.current === challengeKey) {
      return;
    }
    const currentNode = dayNodes[currentIndex] ?? dayNodes[0];
    const currentVisualCenter = (SCENE_TOP_SPACE + currentNode.y - 48) * scale;
    const maxOffset = Math.max(0, contentHeight - viewportHeight);
    const target = Math.min(maxOffset, Math.max(0, currentVisualCenter - viewportHeight / 2));
    scrollRef.current?.scrollTo({y: target, animated: false});
    positionedChallenge.current = challengeKey;
  }, [challengeKey, contentHeight, currentIndex, scale, viewportHeight]);

  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setViewportHeight(previous => previous === nextHeight ? previous : nextHeight);
  }, []);

  const handleDayPress = useCallback((day: HydrationWeekDay, index: number) => {
    haptics.selection();
    setSelected({day, index});
  }, []);
  const handleContentSizeChange = useCallback((_width: number, height: number) => {
    const nextHeight = Math.round(height);
    setContentHeight(previous => previous === nextHeight ? previous : nextHeight);
  }, []);
  const closeDetails = useCallback(() => setSelected(undefined), []);

  return (
    <View style={styles.section}>
      <Text style={styles.range}>
        <Text style={styles.rangeStrong}>{formatShortRange(week.starts_on, week.ends_on)}</Text>
        {'  ·  '}Dia {currentIndex + 1} de 7
      </Text>

      <View onLayout={handleViewportLayout} style={styles.viewport}>
        <ScrollView
          ref={scrollRef}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          onContentSizeChange={handleContentSizeChange}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={challengeTheme.colors.cyan} />}>
          <View style={layout.scene}>
            <ChallengePath scale={scale} />
            {week.days.map((day, index) => (
              <ChallengeDay day={day} index={index} key={day.date} scale={scale} motionEnabled={motionEnabled} onPress={handleDayPress} />
            ))}
          </View>
          {mode === 'solo' ? <Pressable accessibilityRole="button" accessibilityLabel="Ver baú do desafio solo" onPress={onReward} style={styles.chest}>
            <RewardChestIcon opened={reward?.state === 'claimed'} />
            <Text style={styles.chestLabel}>{reward?.state === 'claimed' ? 'Recompensa recebida' : reward?.state === 'available' ? 'Seu baú está liberado!' : 'Baú surpresa • cumpra as 7 metas'}</Text>
          </Pressable> : null}
        </ScrollView>
        {motionEnabled ? <ChallengeBubbles viewportHeight={viewportHeight || 320} /> : null}
      </View>

      <DayDetailsModal day={selected?.day} index={selected?.index ?? 0} onClose={closeDetails} />
    </View>
  );
}

function createLayout(scale: number): {scene: ViewStyle} {
  return {
    scene: {
      alignSelf: 'center', position: 'relative', overflow: 'visible',
      marginTop: SCENE_TOP_SPACE * scale,
      width: timelineLayout.canvasWidth * scale, height: challengeCanvasHeight * scale,
    },
  };
}

function formatShortRange(start: string, end: string): string {
  const [, startMonth, startDay] = start.split('-');
  const [, endMonth, endDay] = end.split('-');
  return startMonth === endMonth
    ? `${startDay}–${endDay} ${monthLabel(endMonth)}`
    : `${startDay} ${monthLabel(startMonth)}–${endDay} ${monthLabel(endMonth)}`;
}

function monthLabel(month: string): string {
  return ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][Number(month) - 1] ?? '';
}

const styles = StyleSheet.create({
  section: {flex: 1, minHeight: 0},
  range: {marginTop: 5, marginBottom: 3, textAlign: 'center', color: '#9BB7D2', fontSize: 14, lineHeight: 19, fontWeight: '700'},
  rangeStrong: {color: challengeTheme.colors.cyan, fontWeight: '900'},
  viewport: {flex: 1, minHeight: 170, overflow: 'hidden'},
  scrollContent: {flexGrow: 1},
  chest: {alignItems: 'center', paddingVertical: 12, gap: 4},
  chestLabel: {color: challengeTheme.colors.cyanStrong, fontSize: 13, fontWeight: '800'},
});
