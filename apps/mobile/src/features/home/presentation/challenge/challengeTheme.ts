import type {HydrationWeekDayState} from '@aqualino/contracts';
import timelineLayoutData from './timeline-layout.json';

export const challengeTheme = {
  referenceWidth: 375,
  canvasWidth: timelineLayoutData.canvasWidth,
  colors: {
    background: '#001226',
    backgroundDeep: '#000D20',
    panel: 'rgba(0, 22, 49, 0.94)',
    panelSoft: 'rgba(0, 25, 54, 0.82)',
    cyan: '#0BE1EC',
    cyanStrong: '#33F3FA',
    cyanGlow: 'rgba(0, 232, 242, 0.48)',
    text: '#F3FAFF',
    muted: '#8DABC8',
    border: '#174B73',
    borderStrong: '#1B668F',
    danger: '#FF94A4',
    gold: '#FFBF23',
    silver: '#B9D8ED',
    bronze: '#DC7D47',
  },
  radius: {
    panel: 22,
    pill: 999,
  },
} as const;

export const timelineLayout = timelineLayoutData;

export const dayNodes = timelineLayout.zigzagOffsets.map((offset, index) => ({
  x: timelineLayout.timelineCenterX + offset,
  y: timelineLayout.firstNodeY + timelineLayout.dayVerticalDistance * index,
}));

export const challengeCanvasHeight = timelineLayout.canvasHeight;

export const dayStateLabels: Record<HydrationWeekDayState, string> = {
  future: 'Futuro',
  no_record: 'Sem registro',
  in_progress: 'Em progresso',
  goal_achieved: 'Meta atingida',
  missed: 'Meta perdida',
};

export const weekdayLabels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'] as const;
