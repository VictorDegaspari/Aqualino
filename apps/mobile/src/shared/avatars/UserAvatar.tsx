import React from 'react';
import {Image, StyleSheet, View, type ImageStyle, type StyleProp} from 'react-native';
import {challengeTheme} from '../../features/home/presentation/challenge/challengeTheme';
import {getAvatarSource} from './avatarOptions';

export function UserAvatar({avatarId, style, children}: React.PropsWithChildren<{
  avatarId?: string | null; style: StyleProp<ImageStyle>;
}>): React.JSX.Element {
  const source = getAvatarSource(avatarId);
  return source
    ? <Image source={source} resizeMethod="resize" resizeMode="cover" style={style} />
    : <View style={[styles.empty, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  empty: {alignItems: 'center', justifyContent: 'center', backgroundColor: challengeTheme.colors.panelSoft},
});
