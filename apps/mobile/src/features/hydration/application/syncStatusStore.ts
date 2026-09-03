import {create} from 'zustand';

interface SyncStatusState {
  syncing: boolean;
  pending: number;
  setSyncing: (syncing: boolean) => void;
  setPending: (pending: number) => void;
}

export const useSyncStatusStore = create<SyncStatusState>(set => ({
  syncing: false,
  pending: 0,
  setSyncing: syncing => set({syncing}),
  setPending: pending => set({pending}),
}));

