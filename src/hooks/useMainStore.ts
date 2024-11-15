import { MainStore, ModelUser as User } from '@/types'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useMainStore = create<MainStore, [['zustand/persist', MainStore]]>(
    persist(
        (set, get) => ({
            profile: get()?.profile,
            setProfile: (profile: User | undefined) => set({ profile }),
        }),
        {
            name: 'mainStore',
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
