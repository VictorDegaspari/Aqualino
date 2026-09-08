import {createMMKV} from 'react-native-mmkv';
import {create} from 'zustand';
import {isHomeThemeId, type HomeThemeId} from '../domain/homeThemes';

const storage = createMMKV({id: 'aqualino.home'});
const themesKey = 'themes.v1';

interface HomePreferencesState {
  themesByUser: Record<string, HomeThemeId>;
  selectTheme: (userId: string, themeId: HomeThemeId) => void;
}

function readThemes(): Record<string, HomeThemeId> {
  try {
    const saved: unknown = JSON.parse(storage.getString(themesKey) ?? '{}');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([userId, themeId]) => userId && isHomeThemeId(themeId)));
  } catch {
    return {};
  }
}

export const useHomePreferencesStore = create<HomePreferencesState>((set, get) => ({
  themesByUser: readThemes(),
  selectTheme(userId, themeId) {
    if (!userId || !isHomeThemeId(themeId)) return;
    const themesByUser = {...get().themesByUser, [userId]: themeId};
    storage.set(themesKey, JSON.stringify(themesByUser));
    set({themesByUser});
  },
}));
