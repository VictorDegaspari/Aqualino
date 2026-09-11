import React, {memo} from 'react';
import {StyleSheet} from 'react-native';
import {RaisedButton} from '../../../../shared/components/RaisedButton';
import {useTranslation} from '../../../../shared/i18n/useTranslation';
import {haptics} from '../../../../shared/device/haptics';
import {ChallengeAsset} from './ChallengeAsset';

export const DrinkWaterButton = memo(function DrinkWaterButtonView({onPress}: {onPress: () => void}): React.JSX.Element {
  const {t} = useTranslation();
  const handlePress = () => {haptics.lightImpact(); onPress();};
  return <RaisedButton
    testID="home-drink-water"
    label={t('Bebi água', 'I drank water', 'Bebí agua')}
    onPress={handlePress}
    tone="ocean"
    size="large"
    icon={<ChallengeAsset name="addWater" style={styles.icon} />}
    style={styles.button}
  />;
});
const styles = StyleSheet.create({
  button: {alignSelf: 'center', width: '70%', minWidth: 238, maxWidth: 290},
  icon: {width: 32, height: 32},
});
