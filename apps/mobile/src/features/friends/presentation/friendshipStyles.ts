import {StyleSheet} from 'react-native';
import {challengeTheme} from '../../home/presentation/challenge/challengeTheme';
const c = challengeTheme.colors;
export const friendshipStyles = StyleSheet.create({
  page: {flex: 1, backgroundColor: c.background},
  header: {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12, borderBottomWidth: 1, borderColor: c.border},
  back: {minWidth: 44, minHeight: 48, justifyContent: 'center'}, backLabel: {fontSize: 36, color: c.cyanStrong},
  title: {fontSize: 22, fontWeight: '900', color: c.text, flexShrink: 1},
  content: {padding: 20, gap: 20, paddingBottom: 36},
  section: {gap: 12}, heading: {fontSize: 19, fontWeight: '800', color: c.text},
  muted: {fontSize: 14, lineHeight: 21, color: c.muted}, error: {fontSize: 14, lineHeight: 21, color: c.danger},
  panel: {backgroundColor: c.panel, borderRadius: 20, borderWidth: 1, borderColor: c.border, padding: 16, gap: 12},
  person: {flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56}, avatar: {width: 54, height: 54},
  identity: {flex: 1, gap: 3}, name: {fontSize: 17, fontWeight: '800', color: c.text},
  actions: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  button: {minHeight: 46, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.cyanStrong, justifyContent: 'center', alignItems: 'center'},
  buttonLabel: {fontSize: 14, fontWeight: '800', color: c.backgroundDeep},
  secondary: {backgroundColor: c.panelSoft, borderWidth: 1, borderColor: c.borderStrong}, secondaryLabel: {color: c.text},
  disabled: {opacity: 0.5}, input: {minHeight: 48, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: c.borderStrong, color: c.text, backgroundColor: c.panel, fontSize: 16},
  hero: {alignItems: 'center', gap: 10}, heroAvatar: {width: 100, height: 100},
  medals: {flexDirection: 'row', gap: 12, justifyContent: 'space-around'}, medal: {flex: 1, alignItems: 'center', gap: 8},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 12}, achievement: {alignItems: 'center', gap: 8, paddingVertical: 8}, achievementTitle: {fontSize: 13, lineHeight: 18, fontWeight: '800', textAlign: 'center', color: c.text},
});
