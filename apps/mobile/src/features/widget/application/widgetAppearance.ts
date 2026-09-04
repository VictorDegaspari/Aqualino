import type {MascotCondition} from '@aqualino/contracts';

export type AppIconMood = 'happy' | 'sad';

export function appIconMoodForCondition(condition: MascotCondition): AppIconMood {
  return condition === 'angry' || condition === 'boiling' || condition === 'skeleton'
    ? 'sad'
    : 'happy';
}
