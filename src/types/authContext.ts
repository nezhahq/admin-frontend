import { ModelProfile } from "@/types"

export interface AuthContextProps {
    profile: ModelProfile | undefined
    login: (username: string, password: string) => void
    loginOauth2: () => void
    logout: () => void
}
