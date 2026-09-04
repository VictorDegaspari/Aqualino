import {createMMKV} from 'react-native-mmkv';
import {create} from 'zustand';

const storage = createMMKV({id: 'aqualino.preferences'});
const lastAmountKey = 'hydration.lastAmountMl';

interface HydrationPreferencesState {
  lastAmountMl?: number;
  selectAmount: (amountMl: number) => void;
}

export const useHydrationPreferencesStore = create<HydrationPreferencesState>(set => ({
  lastAmountMl: storage.getNumber(lastAmountKey),
  selectAmount(amountMl) {
    storage.set(lastAmountKey, amountMl);
    set({lastAmountMl: amountMl});
  },
}));
