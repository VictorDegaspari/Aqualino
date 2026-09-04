import type {MascotCondition} from '@aqualino/contracts';
import type {ImageSourcePropType} from 'react-native';

export const mascotImages: Record<MascotCondition, ImageSourcePropType> = {
  empty: {uri: 'aqualino_happy_active'},
  happy: {uri: 'aqualino_happy_active'},
  angry: {uri: 'aqualino_sad'},
  boiling: {uri: 'aqualino_strong'},
  skeleton: {uri: 'aqualino_sad'},
};
