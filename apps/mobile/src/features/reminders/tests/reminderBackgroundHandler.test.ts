import notifee from '@notifee/react-native';
import '../application/reminderBackgroundHandler';

test('registers the Notifee background handler during entry-point evaluation', () => {
  expect(notifee.onBackgroundEvent).toHaveBeenCalledTimes(1);
  expect(notifee.onBackgroundEvent).toHaveBeenCalledWith(expect.any(Function));
});
