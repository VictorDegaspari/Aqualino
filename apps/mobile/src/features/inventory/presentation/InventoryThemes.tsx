import {useTranslation} from '../../../shared/i18n/useTranslation';
import React, {useState} from 'react';
import {AccessibilityInfo, Pressable, StyleSheet, Text, View} from 'react-native';
import {AqualinoIcon} from '../../../shared/components/AqualinoIcon';
import {haptics} from '../../../shared/device/haptics';
import {homeThemes, type HomeThemeId} from '../../home/domain/homeThemes';
import {HomeThemeBackground} from '../../home/presentation/HomeScene';
import {ChallengeAsset} from '../../home/presentation/challenge/ChallengeAsset';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';

export function InventoryThemes({selectedThemeId, onSelect}: {
  selectedThemeId: HomeThemeId;
  onSelect: (themeId: HomeThemeId) => void;
}): React.JSX.Element {
  const {t} = useTranslation();
  const [error, setError] = useState(false);

  const localizedThemes = homeThemes.map(theme => ({...theme,
    name: theme.id === 'coral-reef' ? t('Corais', 'Corals', 'Corales') : t('Oceano', 'Ocean', 'Océano'),
    description: theme.id === 'coral-reef' ? t('Seu oceano com corais e movimento.', 'Your ocean with corals and movement.', 'Tu océano con corales y movimiento.') : t('O fundo do mar, sem os corais.', 'The seabed without corals.', 'El fondo del mar sin corales.'),
  }));
  const select = (theme: {id: HomeThemeId; name: string}) => {
    if (selectedThemeId === theme.id) return;
    try {
      onSelect(theme.id);
      setError(false);
      haptics.selection();
      AccessibilityInfo.announceForAccessibility(t(`Tema ${theme.name} aplicado.`, `${theme.name} theme applied.`, `Tema ${theme.name} aplicado.`));
    } catch {
      setError(true);
    }
  };

  return <View testID="inventory-theme-collection" style={styles.content}>
    <View style={styles.heading}>
      <View style={styles.titleGroup}>
        <Text accessibilityRole="header" style={styles.title}>{t("Seus temas", "Your themes", "Tus temas")}</Text>
      </View>
    </View>
    <View accessibilityRole="radiogroup" accessibilityLabel="Temas da Home" style={styles.options}>
      {localizedThemes.map(theme => {
        const selected = selectedThemeId === theme.id;
        return <Pressable
          key={theme.id}
          testID={`inventory-theme-${theme.id}`}
          accessibilityRole="radio"
          accessibilityLabel={`${theme.name}. ${theme.description}`}
          accessibilityState={{checked: selected}}
          accessibilityHint={selected ? 'Este tema está em uso na home' : 'Aplica este tema à home'}
          onPress={() => select(theme)}
          style={({pressed}) => [styles.option, selected && styles.selectedOption, pressed && styles.pressed]}>
          <View pointerEvents="none" style={styles.preview}>
            <HomeThemeBackground themeId={theme.id} />
            {theme.decoration === 'corals' ? <>
              <ChallengeAsset name="coralLeftFront" style={styles.previewLeftCoral} />
              <ChallengeAsset name="coralRightFront" style={styles.previewRightCoral} />
            </> : null}
            <AqualinoIcon name="water" size={32} style={styles.previewDrop} />
          </View>
          <View style={styles.optionContent}>
            <View style={styles.optionHeading}>
              <Text style={styles.optionTitle}>{theme.name}</Text>
              <View style={[styles.radio, selected && styles.radioSelected]}>
                {selected ? <AqualinoIcon name="check" size={13} color={challengeTheme.colors.backgroundDeep} /> : null}
              </View>
            </View>
            <Text style={styles.description}>{theme.description}</Text>
            <Text style={[styles.applyLabel, selected && styles.activeLabel]}>{selected ? t("Em uso", "In use", "En uso") : t("Aplicar tema", "Apply theme", "Aplicar tema")}</Text>
          </View>
        </Pressable>;
      })}
    </View>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{t("Não foi possível salvar o tema. Tente novamente.", "Could not save the theme. Try again.", "No se pudo guardar el tema. Inténtalo de nuevo.")}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  content: {gap: 18},
  heading: {flexDirection: 'row', alignItems: 'center', gap: 12},
  titleGroup: {flex: 1},
  title: {fontSize: 23, lineHeight: 30, fontWeight: '900', color: challengeTheme.colors.text},
  options: {gap: 12},
  option: {flexDirection: 'row', alignItems: 'center', gap: 14, padding: 10, borderRadius: 20, borderWidth: 2, borderColor: challengeTheme.colors.border, backgroundColor: challengeTheme.colors.panel},
  selectedOption: {borderColor: challengeTheme.colors.cyanStrong, backgroundColor: challengeTheme.colors.panelSoft},
  preview: {width: 82, height: 102, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center'},
  previewLeftCoral: {position: 'absolute', left: -8, bottom: -18, height: 150, aspectRatio: 724 / 2173},
  previewRightCoral: {position: 'absolute', right: -10, bottom: -18, height: 150, aspectRatio: 724 / 2173},
  previewDrop: {marginTop: -16},
  optionContent: {flex: 1, gap: 5},
  optionHeading: {flexDirection: 'row', alignItems: 'center', gap: 8},
  optionTitle: {flex: 1, fontSize: 17, lineHeight: 23, fontWeight: '900', color: challengeTheme.colors.text},
  radio: {width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: challengeTheme.colors.borderStrong, alignItems: 'center', justifyContent: 'center'},
  radioSelected: {backgroundColor: challengeTheme.colors.cyanStrong, borderColor: challengeTheme.colors.cyanStrong},
  description: {fontSize: 13, lineHeight: 19, color: challengeTheme.colors.muted},
  applyLabel: {marginTop: 3, fontSize: 12, lineHeight: 18, fontWeight: '800', color: challengeTheme.colors.text},
  activeLabel: {color: challengeTheme.colors.cyanStrong},
  error: {fontSize: 14, lineHeight: 20, color: challengeTheme.colors.danger},
  pressed: {opacity: 0.76},
});
