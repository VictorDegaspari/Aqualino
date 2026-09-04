import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AqualinoIcon, type AqualinoIconName} from '../../../../shared/components/AqualinoIcon';
import {challengeTheme} from './challengeTheme';

interface Props {
  onOpenProfile: () => void;
}

export function ChallengeBottomNavigation({onOpenProfile}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const safeAreaStyle = useMemo<ViewStyle>(() => ({height: 50 + insets.bottom, paddingBottom: insets.bottom}), [insets.bottom]);
  return (
    <View style={[styles.navigation, safeAreaStyle]}>
      <NavItem icon="home" label="Início" active />
      <NavItem icon="group" label="Grupo" />
      <NavItem icon="history" label="Histórico" />
      <NavItem icon="profile" label="Perfil" onPress={onOpenProfile} />
    </View>
  );
}

function NavItem({icon, label, active, onPress}: {icon: AqualinoIconName; label: string; active?: boolean; onPress?: () => void}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={!active && !onPress}
      onPress={onPress}
      style={({pressed}) => [styles.item, pressed && styles.pressed]}>
      {active ? <View style={styles.activeLine} /> : null}
      <AqualinoIcon name={icon} size={23} color={active ? challengeTheme.colors.cyan : '#7398BA'} />
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navigation: {
    flexDirection: 'row', paddingHorizontal: 7,
    borderTopWidth: 2, borderColor: challengeTheme.colors.border,
    backgroundColor: 'rgba(0, 17, 39, 0.98)',
  },
  item: {flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center', gap: 3},
  activeLine: {position: 'absolute', top: 0, width: 43, height: 3, borderRadius: 2, backgroundColor: challengeTheme.colors.cyan},
  label: {fontSize: 11, lineHeight: 14, color: '#7398BA', fontWeight: '700'},
  activeLabel: {color: challengeTheme.colors.cyan},
  pressed: {opacity: 0.7},
});
