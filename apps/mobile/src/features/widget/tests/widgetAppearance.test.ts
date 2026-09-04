import {appIconMoodForCondition} from '../application/widgetAppearance';

describe('appIconMoodForCondition', () => {
  it.each([
    ['empty', 'happy'],
    ['happy', 'happy'],
    ['angry', 'sad'],
    ['boiling', 'sad'],
    ['skeleton', 'sad'],
  ] as const)('maps %s to the %s launcher icon', (condition, expected) => {
    expect(appIconMoodForCondition(condition)).toBe(expected);
  });
});
