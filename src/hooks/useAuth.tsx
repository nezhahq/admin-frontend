import { getProfile, login as loginRequest } from "@/api/user"
import { AuthContextProps } from "@/types"
import { createContext, useContext, useEffect, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useMainStore } from "./useMainStore"

const AuthContext = createContext<AuthContextProps>({
    profile: undefined,
    login: () => {},
    loginOauth2: () => {},
    logout: () => {},
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const profile = useMainStore((store) => store.profile)
    const setProfile = useMainStore((store) => store.setProfile)
    const { t } = useTranslation()

    useEffect(() => {
        ;(async () => {
            try {
                const user = await getProfile()
                user.role = user.role || 0
                setProfile(user)
            } catch (error: any) {
                setProfile(undefined)
            }
        })()
    }, [])

    const navigate = useNavigate()

    const login = async (username: string, password: string) => {
        try {
            await loginRequest(username, password)
            const user = await getProfile()
            user.role = user.role || 0
            setProfile(user)
            navigate("/dashboard")
        } catch (error: any) {
            const msg = error?.message
            if (msg === "ApiErrorUnauthorized" || msg === "Unauthorized") {
                toast(t("InvalidUsernameOrPassword"))
            } else {
                toast(msg || t("NetworkError"))
            }
        }
    }

    const loginOauth2 = async () => {
        try {
            const user = await getProfile()
            user.role = user.role || 0
            setProfile(user)
            navigate("/dashboard")
        } catch (error: any) {
            toast(error.message)
        } finally {
            window.history.replaceState({}, document.title, window.location.pathname)
        }
    }

    const logout = () => {
        document.cookie.split(";").forEach(function (c) {
            document.cookie = c
                .replace(/^ +/, "")
                .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/")
        })
        setProfile(undefined)
        navigate("/dashboard/login", { replace: true })
    }

    const value = useMemo(
        () => ({
            profile,
            login,
            loginOauth2,
            logout,
        }),
        [profile],
    )
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    return useContext(AuthContext)
}
