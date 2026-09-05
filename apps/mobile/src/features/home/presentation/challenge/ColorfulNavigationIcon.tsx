import React, {useId} from 'react';
import Svg, {Circle, Defs, LinearGradient, Path, Rect, Stop} from 'react-native-svg';

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

interface IconPaint {
  palette: Palette;
  bodyFill: string;
  accentFill: string;
}

const palettes: Record<ColorfulNavigationIconName, Palette> = {
  home: {primary: '#3AA8CD', secondary: '#8DE0E8', highlight: '#E6FBF8'},
  group: {primary: '#9B7BE0', secondary: '#F2A0CD', highlight: '#FCE0F0'},
  reminders: {primary: '#F1AA49', secondary: '#FFD978', highlight: '#FFF0B3'},
  history: {primary: '#42B995', secondary: '#7BE1BF', highlight: '#D6FAE8'},
  profile: {primary: '#E98372', secondary: '#F7B08C', highlight: '#FFE0C6'},
};

export function ColorfulNavigationIcon({name, size, active}: Props): React.JSX.Element {
  const palette = palettes[name];
  const id = useId();
  const paint = {palette, bodyFill: `url(#${id}-body)`, accentFill: `url(#${id}-accent)`};

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" opacity={active ? 1 : 0.62} accessible={false} pointerEvents="none">
      <Defs>
        <LinearGradient id={`${id}-body`} x1="0" y1="0" x2="0.8" y2="1">
          <Stop stopColor={palette.secondary} />
          <Stop offset="0.55" stopColor={palette.primary} />
          <Stop offset="1" stopColor={palette.primary} />
        </LinearGradient>
        <LinearGradient id={`${id}-accent`} x1="0" y1="0" x2="0.8" y2="1">
          <Stop stopColor={palette.highlight} />
          <Stop offset="0.65" stopColor={palette.secondary} />
          <Stop offset="1" stopColor={palette.secondary} />
        </LinearGradient>
      </Defs>
      {active ? <Circle cx="32" cy="32" r="30" fill={palette.primary} opacity="0.14" /> : null}
      {name === 'home' ? <HomeIcon {...paint} /> : null}
      {name === 'group' ? <GroupIcon {...paint} /> : null}
      {name === 'reminders' ? <ReminderIcon {...paint} /> : null}
      {name === 'history' ? <HistoryIcon {...paint} /> : null}
      {name === 'profile' ? <ProfileIcon {...paint} /> : null}
    </Svg>
  );
}

function HomeIcon({palette, bodyFill, accentFill}: IconPaint): React.JSX.Element {
  return (
    <>
      <Path d="M13 28 32 13l19 15v22a6 6 0 0 1-6 6H19a6 6 0 0 1-6-6V28Z" fill={bodyFill} />
      <Path d="M7 29 28.9 10.7a5 5 0 0 1 6.2 0L57 29" fill="none" stroke={palette.primary} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="m9 27 20.5-17a4 4 0 0 1 5 0L55 27" fill="none" stroke={palette.secondary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M26 56V43a6 6 0 0 1 12 0v13H26Z" fill={accentFill} />
      <Rect x="19" y="29" width="7" height="7" rx="2" fill={palette.highlight} opacity="0.88" />
      <Rect x="38" y="29" width="7" height="7" rx="2" fill={palette.highlight} opacity="0.88" />
      <Path d="M17 39v10a3 3 0 0 0 3 3" fill="none" stroke={palette.secondary} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </>
  );
}

function GroupIcon({palette, bodyFill, accentFill}: IconPaint): React.JSX.Element {
  return (
    <>
      <Circle cx="13" cy="25" r="6.5" fill={accentFill} />
      <Circle cx="51" cy="25" r="6.5" fill={accentFill} />
      <Path d="M3 47c0-7 4-12 10-12s11 5 11 12v4H7a4 4 0 0 1-4-4Z" fill={accentFill} />
      <Path d="M61 47c0-7-4-12-10-12s-11 5-11 12v4h17a4 4 0 0 0 4-4Z" fill={accentFill} />
      <Circle cx="32" cy="18" r="10" fill={bodyFill} />
      <Path d="M17 50c0-10 6-17 15-17s15 7 15 17v2a4 4 0 0 1-4 4H21a4 4 0 0 1-4-4v-2Z" fill={bodyFill} />
      <Path d="M26 15a7 7 0 0 1 7-4" fill="none" stroke={palette.highlight} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <Path d="M22 46c1-5 4-8 8-9" fill="none" stroke={palette.highlight} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    </>
  );
}

function ReminderIcon({palette, bodyFill, accentFill}: IconPaint): React.JSX.Element {
  return (
    <>
      <Path d="M32 7v6" stroke={palette.secondary} strokeWidth="6" strokeLinecap="round" />
      <Circle cx="32" cy="52" r="6" fill={accentFill} />
      <Path d="M16 28a16 16 0 0 1 32 0c0 10 2 13 5 16a3 3 0 0 1-2 5H13a3 3 0 0 1-2-5c3-3 5-6 5-16Z" fill={bodyFill} />
      <Path d="M22 28c0-6 3-10 8-11" fill="none" stroke={palette.highlight} strokeWidth="3.5" strokeLinecap="round" opacity="0.88" />
      <Path d="M17 44h30" stroke={palette.secondary} strokeWidth="3" strokeLinecap="round" />
      <Path d="M11 14a24 24 0 0 0-4 12m46-12a24 24 0 0 1 4 12" fill="none" stroke={palette.secondary} strokeWidth="3.5" strokeLinecap="round" />
    </>
  );
}

function HistoryIcon({palette, bodyFill, accentFill}: IconPaint): React.JSX.Element {
  return (
    <>
      <Rect x="8" y="8" width="48" height="48" rx="10" fill={palette.primary} opacity="0.12" />
      <Rect x="8" y="8" width="48" height="48" rx="10" fill="none" stroke={palette.primary} strokeWidth="3" />
      <Rect x="16" y="34" width="8" height="14" rx="3" fill={palette.secondary} />
      <Rect x="28" y="26" width="8" height="22" rx="3" fill={bodyFill} />
      <Rect x="40" y="17" width="8" height="31" rx="3" fill={accentFill} />
      <Path d="M13 23v-5a5 5 0 0 1 5-5h6" fill="none" stroke={palette.highlight} strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
    </>
  );
}

function ProfileIcon({palette, bodyFill, accentFill}: IconPaint): React.JSX.Element {
  return (
    <>
      <Circle cx="32" cy="19" r="11" fill={accentFill} />
      <Path d="M11 51c0-10 9-17 21-17s21 7 21 17v1a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4v-1Z" fill={bodyFill} />
      <Path d="M24 35c2 6 14 6 16 0" fill={palette.secondary} />
      <Path d="M26 17a7 7 0 0 1 7-5" fill="none" stroke={palette.highlight} strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      <Path d="M17 48c1-4 4-7 8-8" fill="none" stroke={palette.highlight} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </>
  );
}
