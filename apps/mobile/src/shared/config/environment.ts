import { Platform } from 'react-native';

/** Android Emulator reaches the host at 10.0.2.2. See the root README for physical devices. */
export const API_BASE_URL = Platform.select({
  android: 'http://127.0.0.1:8080/api/v1',
  ios: 'http://127.0.0.1:8080/api/v1',
  default: 'http://127.0.0.1:8080/api/v1',
});

