import React, {memo, type ComponentType} from 'react';
import {StyleSheet, View} from 'react-native';
import {getHomeTheme, type HomeTheme, type HomeThemeId} from '../domain/homeThemes';
import {ChallengeBackground} from './challenge/ChallengeBackground';
import {ChallengeSceneDecoration} from './challenge/ChallengeSceneDecoration';

const backgrounds: Record<HomeTheme['background'], ComponentType> = {
  ocean: ChallengeBackground,
};

const decorations: Record<HomeTheme['decoration'], ComponentType | null> = {
  corals: ChallengeSceneDecoration,
  none: null,
};

export function HomeThemeBackground({themeId}: {themeId: HomeThemeId}): React.JSX.Element {
  const theme = getHomeTheme(themeId);
  const Background = backgrounds[theme.background];
  return <Background />;
}

export const HomeScene = memo(function HomeSceneView({themeId, motionEnabled}: {
  themeId: HomeThemeId;
  motionEnabled: boolean;
}): React.JSX.Element {
  const theme = getHomeTheme(themeId);
  const Decoration = decorations[theme.decoration];

  return <View testID={`home-scene-${theme.id}`} pointerEvents="none" style={StyleSheet.absoluteFill}>
    <HomeThemeBackground themeId={theme.id} />
    {motionEnabled && Decoration ? <Decoration /> : null}
  </View>;
});
