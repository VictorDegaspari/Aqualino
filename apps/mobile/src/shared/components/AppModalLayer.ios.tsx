import React from 'react';
import {FullWindowOverlay} from 'react-native-screens';

export function AppModalLayer({children}: React.PropsWithChildren): React.JSX.Element {
  return <FullWindowOverlay unstable_accessibilityContainerViewIsModal>{children}</FullWindowOverlay>;
}
