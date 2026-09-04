import type {TurboModule} from 'react-native';
import {TurboModuleRegistry} from 'react-native';

export interface Spec extends TurboModule {
  writeSnapshot(snapshotJson: string): boolean;
  requestReload(): void;
  readPendingAction(): string | null;
  getSchemaVersion(): number;
  setAppIconMood(mood: string): boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>('NativeAqualinoWidget');
