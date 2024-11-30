import { ConfigStore } from '@/types'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useConfigStore = create<ConfigStore, [['zustand/persist', ConfigStore]]>(
    persist(
        (set, get) => ({
            config: get()?.config,
            setConfig: config => set({ config }),
        }),
        {
            name: 'configStore',
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
