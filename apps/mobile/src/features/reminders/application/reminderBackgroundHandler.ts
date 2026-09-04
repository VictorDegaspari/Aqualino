import notifee from '@notifee/react-native';

// This side effect must run before the React tree is imported. Background launches do not mount App.
notifee.onBackgroundEvent(() => Promise.resolve());
