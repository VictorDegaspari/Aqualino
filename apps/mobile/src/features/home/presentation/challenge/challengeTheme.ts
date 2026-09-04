import type {HydrationWeekDayState} from '@aqualino/contracts';
import timelineLayoutData from './timeline-layout.json';

export const challengeTheme = {
  referenceWidth: 375,
  canvasWidth: timelineLayoutData.canvasWidth,
  colors: {
    background: '#0B202C',
    backgroundDeep: '#071820',
    panel: 'rgba(16, 43, 59, 0.94)',
    panelSoft: 'rgba(20, 55, 73, 0.84)',
    cyan: '#69ADBA',
    cyanStrong: '#91C8D1',
    cyanGlow: 'rgba(105, 173, 186, 0.3)',
    text: '#F1F7F6',
    muted: '#A9C0C5',
    border: '#2B596A',
    borderStrong: '#3B7180',
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
