import React, {useMemo} from 'react';
import {Pressable, StyleSheet, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {haptics} from '../../../../shared/device/haptics';
import {challengeTheme} from './challengeTheme';
import {ColorfulNavigationIcon, type ColorfulNavigationIconName} from './ColorfulNavigationIcon';

export type ChallengeBottomTab = 'home' | 'group' | 'reminders' | 'history' | 'profile';

interface Props {
  activeTab: ChallengeBottomTab;
  onOpenHome?: () => void;
  onOpenGroup?: () => void;
  onOpenReminders?: () => void;
  onOpenHistory?: () => void;
  onOpenProfile?: () => void;
}

export function ChallengeBottomNavigation({activeTab, onOpenHome, onOpenGroup, onOpenReminders, onOpenHistory, onOpenProfile}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const safeAreaStyle = useMemo<ViewStyle>(() => ({height: 58 + insets.bottom, paddingBottom: insets.bottom}), [insets.bottom]);
  return (
    <View style={[styles.navigation, safeAreaStyle]}>
      <NavItem icon="home" label="Início" active={activeTab === 'home'} onPress={onOpenHome} />
      <NavItem icon="group" label="Grupo" active={activeTab === 'group'} onPress={onOpenGroup} />
      <NavItem icon="reminders" label="Lembretes" active={activeTab === 'reminders'} onPress={onOpenReminders} />
      <NavItem icon="history" label="Histórico" active={activeTab === 'history'} onPress={onOpenHistory} />
      <NavItem icon="profile" label="Perfil" active={activeTab === 'profile'} onPress={onOpenProfile} />
    </View>
  );
}

function NavItem({icon, label, active = false, onPress}: {icon: ColorfulNavigationIconName; label: string; active?: boolean; onPress?: () => void}) {
  const handlePress = () => {
    if (active || !onPress) {
      return;
    }

    haptics.lightImpact();
    onPress();
  };

  return (
    <Pressable
      testID={`nav-${icon}`}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{selected: active, disabled: active || !onPress}}
      disabled={active || !onPress}
      onPress={handlePress}
      style={({pressed}) => [styles.item, pressed && styles.pressed]}>
      {active ? <View style={styles.activeLine} /> : null}
      <ColorfulNavigationIcon name={icon} size={active ? 34 : 30} active={active} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navigation: {
    flexDirection: 'row', paddingHorizontal: 8,
    borderTopWidth: 2, borderColor: challengeTheme.colors.border,
    backgroundColor: 'rgba(0, 17, 39, 0.98)',
  },
  item: {flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center'},
  activeLine: {position: 'absolute', top: 3, width: 32, height: 3, borderRadius: 2, backgroundColor: challengeTheme.colors.cyanStrong},
  pressed: {opacity: 0.7, transform: [{scale: 0.94}]},
});
