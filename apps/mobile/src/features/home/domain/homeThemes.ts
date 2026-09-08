export const homeThemes = [
  {
    id: 'coral-reef',
    background: 'ocean',
    decoration: 'corals',
    name: 'Corais',
    description: 'Seu oceano com corais e movimento.',
  },
  {
    id: 'open-ocean',
    background: 'ocean',
    decoration: 'none',
    name: 'Oceano',
    description: 'O fundo do mar, sem os corais.',
  },
] as const;

export type HomeTheme = typeof homeThemes[number];
export type HomeThemeId = HomeTheme['id'];
export const defaultHomeThemeId: HomeThemeId = 'coral-reef';

export function isHomeThemeId(value: unknown): value is HomeThemeId {
  return homeThemes.some(theme => theme.id === value);
}

export function getHomeTheme(value: unknown): HomeTheme {
  return homeThemes.find(theme => theme.id === value) ?? homeThemes[0];
}
