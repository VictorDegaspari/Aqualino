import React, {createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useMemo, useState} from 'react';
import {BackHandler, StyleSheet, View} from 'react-native';
import {AppModalLayer} from './AppModalLayer';

interface ModalEntry {
  id: string;
  content: React.ReactNode;
  onRequestClose: () => void;
  dismissible: boolean;
}

const ModalContext = createContext<{
  update: (entry: ModalEntry) => void;
  remove: (id: string) => void;
} | null>(null);

export function AppModalProvider({children}: React.PropsWithChildren): React.JSX.Element {
  const [entries, setEntries] = useState<ModalEntry[]>([]);
  const update = useCallback((entry: ModalEntry) => {
    setEntries(current => current.some(item => item.id === entry.id)
      ? current.map(item => item.id === entry.id ? entry : item)
      : [...current, entry]);
  }, []);
  const remove = useCallback((id: string) => setEntries(current => current.filter(item => item.id !== id)), []);
  const context = useMemo(() => ({update, remove}), [remove, update]);
  const active = entries.at(-1);

  useEffect(() => {
    if (!active) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (active.dismissible) active.onRequestClose();
      return true;
    });
    return () => subscription.remove();
  }, [active]);

  return (
    <ModalContext.Provider value={context}>
      <View style={styles.root}>
        <View
          style={styles.root}
          pointerEvents={active ? 'none' : 'auto'}
          accessibilityElementsHidden={Boolean(active)}
          importantForAccessibility={active ? 'no-hide-descendants' : 'auto'}>
          {children}
        </View>
        {active ? <AppModalLayer>{entries.map(entry => (
          <View
            key={entry.id}
            style={styles.overlay}
            pointerEvents={entry === active ? 'auto' : 'none'}
            accessibilityViewIsModal={entry === active}
            accessibilityElementsHidden={entry !== active}
            importantForAccessibility={entry === active ? 'auto' : 'no-hide-descendants'}
            onAccessibilityEscape={() => {if (entry === active && entry.dismissible) entry.onRequestClose();}}>
            {entry.content}
          </View>
        ))}</AppModalLayer> : null}
      </View>
    </ModalContext.Provider>
  );
}

/** Renders above the app without creating an Android dialog or an iOS modal window. */
export function AppModal({children, onRequestClose, dismissible = true}: React.PropsWithChildren<{
  onRequestClose: () => void;
  dismissible?: boolean;
}>): null {
  const context = useContext(ModalContext);
  const id = useId();
  if (!context) throw new Error('AppModal requires AppModalProvider.');
  const {update, remove} = context;

  useLayoutEffect(() => {
    update({id, content: children, onRequestClose, dismissible});
  }, [children, dismissible, id, onRequestClose, update]);
  useLayoutEffect(() => () => remove(id), [id, remove]);

  return null;
}

const styles = StyleSheet.create({
  root: {flex: 1},
  overlay: {position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, elevation: 100},
});
