import { MainStore } from '@/types'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useMainStore = create<MainStore, [['zustand/persist', MainStore]]>(
    persist(
        (set, get) => ({
            profile: get()?.profile,
            setProfile: profile => set({ profile }),
        }),
        {
            name: 'mainStore',
            storage: createJSONStorage(() => localStorage),
        },
    ),
)