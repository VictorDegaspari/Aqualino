import React from 'react';
import Svg, {Circle, Path, Rect} from 'react-native-svg';

export type ColorfulNavigationIconName = 'home' | 'group' | 'reminders' | 'history' | 'profile';

interface Props {
  name: ColorfulNavigationIconName;
  size: number;
  active: boolean;
}

type Palette = {
  primary: string;
  secondary: string;
  highlight: string;
};

const palettes: Record<ColorfulNavigationIconName, Palette> = {
  home: {primary: '#3AA8CD', secondary: '#8DE0E8', highlight: '#E6FBF8'},
  group: {primary: '#9B7BE0', secondary: '#F2A0CD', highlight: '#FCE0F0'},
  reminders: {primary: '#F1AA49', secondary: '#FFD978', highlight: '#FFF0B3'},
  history: {primary: '#42B995', secondary: '#7BE1BF', highlight: '#D6FAE8'},
  profile: {primary: '#E98372', secondary: '#F7B08C', highlight: '#FFE0C6'},
};

export function ColorfulNavigationIcon({name, size, active}: Props): React.JSX.Element {
  const palette = palettes[name];

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" opacity={active ? 1 : 0.62}>
      {active ? <Circle cx="32" cy="32" r="30" fill={palette.primary} opacity="0.14" /> : null}
      {name === 'home' ? <HomeIcon palette={palette} /> : null}
      {name === 'group' ? <GroupIcon palette={palette} /> : null}
      {name === 'reminders' ? <ReminderIcon palette={palette} /> : null}
      {name === 'history' ? <HistoryIcon palette={palette} /> : null}
      {name === 'profile' ? <ProfileIcon palette={palette} /> : null}
    </Svg>
  );
}

function HomeIcon({palette}: {palette: Palette}): React.JSX.Element {
  return (
    <>
      <Path d="m8 30 24-19 24 19v23a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V30Z" fill={palette.primary} />
      <Path d="m13 30 19-15 19 15v4H13v-4Z" fill={palette.secondary} />
      <Path d="M24 57V39h16v18H24Z" fill={palette.highlight} />
      <Path d="M30 21c-4 5-6 9-6 13a8 8 0 0 0 16 0c0-4-2-8-6-13l-2-3-2 3Z" fill={palette.secondary} />
    </>
  );
}

function GroupIcon({palette}: {palette: Palette}): React.JSX.Element {
  return (
    <>
      <Circle cx="32" cy="19" r="10" fill={palette.primary} />
      <Circle cx="14" cy="26" r="7" fill={palette.secondary} />
      <Circle cx="50" cy="26" r="7" fill={palette.secondary} />
      <Path d="M13 55c1-14 8-22 19-22s18 8 19 22H13Z" fill={palette.primary} />
      <Path d="M1 55c1-10 5-16 13-16 4 0 8 2 10 6-3 3-4 7-4 10H1Z" fill={palette.secondary} />
      <Path d="M63 55c-1-10-5-16-13-16-4 0-8 2-10 6 3 3 4 7 4 10h19Z" fill={palette.secondary} />
      <Path d="M27 46h10v11H27z" fill={palette.highlight} opacity="0.86" />
    </>
  );
}

function ReminderIcon({palette}: {palette: Palette}): React.JSX.Element {
  return (
    <>
      <Path d="M47 27a15 15 0 0 0-30 0c0 16-7 17-7 20h44c0-3-7-4-7-20Z" fill={palette.primary} />
      <Path d="M22 28a10 10 0 0 1 19-4" fill="none" stroke={palette.highlight} strokeWidth="4" strokeLinecap="round" />
      <Path d="M25 54c2 3 4 4 7 4s6-1 8-4H25Z" fill={palette.secondary} />
      <Circle cx="47" cy="17" r="8" fill={palette.secondary} />
      <Path d="M47 13v8m-4-4h8" stroke={palette.highlight} strokeWidth="2.8" strokeLinecap="round" />
    </>
  );
}

function HistoryIcon({palette}: {palette: Palette}): React.JSX.Element {
  return (
    <>
      <Rect x="8" y="35" width="12" height="21" rx="4" fill={palette.secondary} />
      <Rect x="26" y="23" width="12" height="33" rx="4" fill={palette.primary} />
      <Rect x="44" y="9" width="12" height="47" rx="4" fill={palette.highlight} />
      <Path d="M10 20c8-8 17-4 23 2 7 6 13 5 21-5" fill="none" stroke={palette.primary} strokeWidth="4" strokeLinecap="round" />
      <Circle cx="54" cy="17" r="3" fill={palette.secondary} />
    </>
  );
}

function ProfileIcon({palette}: {palette: Palette}): React.JSX.Element {
  return (
    <>
      <Circle cx="32" cy="22" r="14" fill={palette.secondary} />
      <Path d="M8 57c2-16 11-25 24-25s22 9 24 25H8Z" fill={palette.primary} />
      <Circle cx="27" cy="20" r="2" fill={palette.highlight} />
      <Circle cx="37" cy="20" r="2" fill={palette.highlight} />
      <Path d="M25 27c4 4 10 4 14 0" fill="none" stroke={palette.highlight} strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M17 54c3-7 8-11 15-11s12 4 15 11H17Z" fill={palette.secondary} opacity="0.75" />
    </>
  );
}
