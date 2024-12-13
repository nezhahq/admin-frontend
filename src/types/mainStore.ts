import { ModelProfile } from "@/types"

export interface MainStore {
    profile: ModelProfile | undefined
    setProfile: (profile: ModelProfile | undefined) => void
}
