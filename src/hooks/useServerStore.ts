import { ServerStore } from "@/types"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const useServerStore = create<ServerStore, [["zustand/persist", ServerStore]]>(
    persist(
        (set, get) => ({
            server: get()?.server,
            serverGroup: get()?.serverGroup,
            setServer: (server) => set({ server }),
            setServerGroup: (serverGroup) => set({ serverGroup }),
        }),
        {
            name: "serverStore",
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
