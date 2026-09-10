import {Platform} from 'react-native';
import NativeAqualinoWidget from '../../../../specs/NativeAqualinoWidget';

/** True means the launcher accepted the request, not that the user added the widget. */
export async function requestWidgetPin(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  return NativeAqualinoWidget.requestPinWidget();
}
