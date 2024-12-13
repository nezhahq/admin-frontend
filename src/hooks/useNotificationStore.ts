import { NotificationStore } from "@/types"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const useNotificationStore = create<
    NotificationStore,
    [["zustand/persist", NotificationStore]]
>(
    persist(
        (set, get) => ({
            notifiers: get()?.notifiers,
            notifierGroup: get()?.notifierGroup,
            setNotifier: (notifiers) => set({ notifiers }),
            setNotifierGroup: (notifierGroup) => set({ notifierGroup }),
        }),
        {
            name: "notificationStore",
            storage: createJSONStorage(() => localStorage),
        },
    ),
)
