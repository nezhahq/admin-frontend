import { MainStore } from "@/types"
import { create } from "zustand"
import { createJSONStorage, persist } from "zustand/middleware"

export const useMainStore = create<MainStore, [["zustand/persist", Pick<MainStore, "profile">]]>(
    persist(
        (set, get) => ({
            profile: get()?.profile,
            setProfile: (profile) => set({ profile }),
        }),
        {
            name: "mainStore",
            storage: createJSONStorage(() => localStorage),
            // agent_secret 能让任意主机注册为 agent，不能落进 localStorage
            // （任何同源脚本、浏览器扩展都读得到）。它只留在内存里，刷新后由
            // AuthProvider 挂载时的 getProfile 重新取回。
            partialize: (state) => ({
                profile: state.profile ? { ...state.profile, agent_secret: "" } : undefined,
            }),
        },
    ),
)
