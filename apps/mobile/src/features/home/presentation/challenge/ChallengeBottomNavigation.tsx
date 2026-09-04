import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, View, type ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AqualinoIcon, type AqualinoIconName} from '../../../../shared/components/AqualinoIcon';
import {BellIcon} from '../../../../shared/components/BellIcon';
import {haptics} from '../../../../shared/device/haptics';
import {challengeTheme} from './challengeTheme';

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
  const safeAreaStyle = useMemo<ViewStyle>(() => ({height: 50 + insets.bottom, paddingBottom: insets.bottom}), [insets.bottom]);
  return (
    <View style={[styles.navigation, safeAreaStyle]}>
      <NavItem icon="home" label="Início" active={activeTab === 'home'} onPress={onOpenHome} />
      <NavItem icon="group" label="Grupo" active={activeTab === 'group'} onPress={onOpenGroup} />
      <NavItem icon="reminder" label="Lembretes" active={activeTab === 'reminders'} onPress={onOpenReminders} />
      <NavItem icon="history" label="Histórico" active={activeTab === 'history'} onPress={onOpenHistory} />
      <NavItem icon="profile" label="Perfil" active={activeTab === 'profile'} onPress={onOpenProfile} />
    </View>
  );
}

function NavItem({icon, label, active, onPress}: {icon: AqualinoIconName | 'reminder'; label: string; active?: boolean; onPress?: () => void}) {
  const handlePress = () => {
    if (active || !onPress) {
      return;
    }

    haptics.selection();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      disabled={active || !onPress}
      onPress={handlePress}
      style={({pressed}) => [styles.item, pressed && styles.pressed]}>
      {active ? <View style={styles.activeLine} /> : null}
      {icon === 'reminder'
        ? <BellIcon size={23} color={active ? challengeTheme.colors.cyan : '#7398BA'} />
        : <AqualinoIcon name={icon} size={23} color={active ? challengeTheme.colors.cyan : '#7398BA'} />}
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
  label: {fontSize: 10, lineHeight: 13, color: '#7398BA', fontWeight: '700'},
  activeLabel: {color: challengeTheme.colors.cyan},
  pressed: {opacity: 0.7},
});
