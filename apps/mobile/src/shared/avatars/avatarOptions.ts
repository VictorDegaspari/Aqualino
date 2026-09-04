import type {ImageSourcePropType} from 'react-native';

export const avatarSources = {
  avatar_1: require('../../assets/avatars/avatar_1.webp'),
  avatar_2: require('../../assets/avatars/avatar_2.webp'),
  avatar_3: require('../../assets/avatars/avatar_3.webp'),
  avatar_4: require('../../assets/avatars/avatar_4.webp'),
  avatar_5: require('../../assets/avatars/avatar_5.webp'),
  avatar_6: require('../../assets/avatars/avatar_6.webp'),
  avatar_7: require('../../assets/avatars/avatar_7.webp'),
  avatar_8: require('../../assets/avatars/avatar_8.webp'),
} as const satisfies Record<string, ImageSourcePropType>;

export type AvatarId = keyof typeof avatarSources;

export const avatarIds = Object.keys(avatarSources) as AvatarId[];
export const defaultAvatarId: AvatarId = 'avatar_1';

export function getAvatarSource(avatarId?: string | null): ImageSourcePropType {
  return avatarId && avatarId in avatarSources
    ? avatarSources[avatarId as AvatarId]
    : avatarSources[defaultAvatarId];
}
