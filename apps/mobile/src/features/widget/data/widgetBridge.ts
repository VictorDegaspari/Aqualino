import type {WidgetSnapshot} from '@aqualino/contracts';
import NativeAqualinoWidget from '../../../../specs/NativeAqualinoWidget';

export interface WidgetSnapshotWriter {
  write(snapshot: WidgetSnapshot): Promise<void>;
}

export const widgetBridge: WidgetSnapshotWriter = {
  async write(snapshot) {
    if (NativeAqualinoWidget.getSchemaVersion() !== snapshot.schema_version) {
      return;
    }
    if (NativeAqualinoWidget.writeSnapshot(JSON.stringify(snapshot))) {
      NativeAqualinoWidget.requestReload();
    }
  },
};

