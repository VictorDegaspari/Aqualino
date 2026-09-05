import React, {memo, useCallback} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {avatarIds, getAvatarSource, type AvatarId} from '../../../shared/avatars/avatarOptions';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

interface Props {
  disabled?: boolean;
  selectedAvatar: AvatarId | null;
  onClose: () => void;
  onSelect: (avatarId: AvatarId) => void;
}

export const AvatarPicker = memo(function AvatarPickerView({
  disabled = false,
  selectedAvatar,
  onClose,
  onSelect,
}: Props): React.JSX.Element {
  return (
    <View accessibilityRole="radiogroup" style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text style={styles.title}>Escolha seu avatar</Text>
          <Text style={styles.subtitle}>A escolha é salva automaticamente e aparece no placar do grupo.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Fechar editor de avatar"
          onPress={onClose}
          style={({pressed}) => [styles.closeButton, pressed && styles.buttonPressed]}>
          <Text style={styles.closeLabel}>Fechar</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {avatarIds.map((avatarId, index) => (
          <AvatarOption
            key={avatarId}
            avatarId={avatarId}
            disabled={disabled}
            index={index}
            selected={selectedAvatar === avatarId}
            onSelect={onSelect}
          />
        ))}
      </View>
    </View>
  );
});

interface AvatarOptionProps {
  avatarId: AvatarId;
  disabled: boolean;
  index: number;
  selected: boolean;
  onSelect: (avatarId: AvatarId) => void;
}

const AvatarOption = memo(function AvatarOptionView({
  avatarId,
  disabled,
  index,
  selected,
  onSelect,
}: AvatarOptionProps): React.JSX.Element {
  const handlePress = useCallback(() => onSelect(avatarId), [avatarId, onSelect]);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`Avatar ${index + 1}`}
      accessibilityState={{checked: selected, disabled}}
      disabled={disabled}
      onPress={handlePress}
      style={({pressed}) => [
        styles.option,
        selected && styles.optionSelected,
        pressed && !disabled && styles.optionPressed,
      ]}>
      <Image source={getAvatarSource(avatarId)} resizeMethod="resize" resizeMode="cover" style={styles.optionImage} />
      {selected ? (
        <View style={styles.selectedMark}>
          <AqualinoIcon name="check" size={15} color={challengeTheme.colors.backgroundDeep} />
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  panel: {
    padding: 18,
    borderRadius: challengeTheme.radius.panel,
    backgroundColor: challengeTheme.colors.panel,
    borderWidth: 1,
    borderColor: challengeTheme.colors.borderStrong,
  },
  header: {flexDirection: 'row', gap: 12, alignItems: 'flex-start'},
  heading: {flex: 1},
  title: {fontSize: 19, lineHeight: 25, fontWeight: '900', color: challengeTheme.colors.text},
  subtitle: {marginTop: 3, fontSize: 13, lineHeight: 18, color: challengeTheme.colors.muted},
  closeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: challengeTheme.radius.pill,
    backgroundColor: 'rgba(11, 225, 236, 0.12)',
    borderWidth: 1,
    borderColor: challengeTheme.colors.borderStrong,
  },
  closeLabel: {fontSize: 12, lineHeight: 16, fontWeight: '900', color: challengeTheme.colors.cyanStrong},
  buttonPressed: {opacity: 0.74},
  grid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 13, marginTop: 18},
  option: {
    width: '21%',
    aspectRatio: 1,
    borderRadius: 99,
    padding: 3,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: challengeTheme.colors.border,
    backgroundColor: challengeTheme.colors.panelSoft,
  },
  optionSelected: {
    borderColor: challengeTheme.colors.cyanStrong,
    shadowColor: challengeTheme.colors.cyan,
    shadowOpacity: 0.8,
    shadowRadius: 9,
    shadowOffset: {width: 0, height: 0},
    elevation: 7,
  },
  optionPressed: {opacity: 0.85, transform: [{scale: 0.94}]},
  optionImage: {width: '100%', height: '100%', borderRadius: 99},
  selectedMark: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 25,
    height: 25,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: challengeTheme.colors.cyanStrong,
    borderWidth: 2,
    borderColor: challengeTheme.colors.panel,
  },
});
