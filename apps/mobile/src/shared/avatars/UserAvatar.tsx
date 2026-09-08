import React from 'react';
import {Image, StyleSheet, View, type ImageStyle, type StyleProp} from 'react-native';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';
import {AqualinoIcon} from '../components/AqualinoIcon';
import {getAvatarSource} from './avatarOptions';

export function UserAvatar({avatarId, style}: {
  avatarId?: string | null; style: StyleProp<ImageStyle>;
}): React.JSX.Element {
  const source = getAvatarSource(avatarId);
  return <View style={[styles.container, style]}>
    {source
      ? <Image source={source} resizeMethod="resize" resizeMode="cover" style={styles.image} />
      : <AqualinoIcon name="profile" size={32} color={challengeTheme.colors.cyanStrong} style={styles.placeholder} />}
  </View>;
}

const styles = StyleSheet.create({
  container: {alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: 999, backgroundColor: challengeTheme.colors.panelSoft},
  // The avatar artwork includes transparent margins around its circular portrait.
  image: {width: '100%', height: '100%', transform: [{scale: 1.24}]},
  placeholder: {width: '62%', height: '62%'},
});
