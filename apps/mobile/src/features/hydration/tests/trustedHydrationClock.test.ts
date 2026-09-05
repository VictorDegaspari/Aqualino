import {TrustedHydrationClock} from '../application/trustedHydrationClock';

const serverTime = '2026-09-03T02:59:30.000Z';

test('uses elapsed monotonic time instead of the device date, including at midnight', () => {
  let elapsed = 0;
  let wall = Date.parse(serverTime);
  const clock = new TrustedHydrationClock(() => wall, () => elapsed);
  clock.synchronize(serverTime);

  // Even an allowed small clock difference cannot advance the civil day.
  wall += 60000;
  expect(clock.recordedAt()).toBe(serverTime);
  elapsed += 30000;
  expect(clock.recordedAt()).toBe('2026-09-03T03:00:00.000Z');
});

test.each([86400000, -86400000, NaN])('blocks a changed or invalid device clock (%s)', change => {
  let wall = Date.parse(serverTime);
  const clock = new TrustedHydrationClock(() => wall, () => 0);
  clock.synchronize(serverTime);
  wall += change;
  expect(() => clock.recordedAt()).toThrow(expect.objectContaining({code: 'DEVICE_CLOCK_CHANGED'}));
});

test('requires a fresh server reference after restarting or expiring the clock', () => {
  let elapsed = 0;
  const clock = new TrustedHydrationClock(() => Date.parse(serverTime) + elapsed, () => elapsed);
  expect(() => clock.recordedAt()).toThrow(expect.objectContaining({code: 'HYDRATION_TIME_UNVERIFIED'}));
  clock.synchronize(serverTime);
  elapsed = 86400001;
  expect(() => clock.recordedAt()).toThrow(expect.objectContaining({code: 'HYDRATION_TIME_UNVERIFIED'}));
  clock.synchronize(new Date(Date.parse(serverTime) + elapsed).toISOString());
  expect(clock.recordedAt()).toBe('2026-09-04T02:59:30.001Z');
});

test('fails closed if the monotonic source resets or the reference is malformed', () => {
  let elapsed = 10;
  const clock = new TrustedHydrationClock(() => Date.parse(serverTime), () => elapsed);
  clock.synchronize('invalid');
  expect(() => clock.recordedAt()).toThrow();
  clock.synchronize(serverTime);
  elapsed = 0;
  expect(() => clock.recordedAt()).toThrow(expect.objectContaining({code: 'HYDRATION_TIME_UNVERIFIED'}));
});
