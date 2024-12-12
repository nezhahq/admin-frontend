import { createContext, useContext, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMainStore } from "./useMainStore";
import { AuthContextProps } from "@/types";
import { getProfile, login as loginRequest } from "@/api/user";
import { toast } from "sonner";

const AuthContext = createContext<AuthContextProps>({
    profile: undefined,
    login: () => { },
    logout: () => { },
});

export const AuthProvider = ({ children }: {
    children: React.ReactNode;
}) => {
    const profile = useMainStore(store => store.profile)
    const setProfile = useMainStore(store => store.setProfile)

    useEffect(() => {
        (async () => {
            try {
                const user = await getProfile();
                setProfile(user);
            } catch (error: any) {
                setProfile(undefined);
                console.log("Error fetching profile", error);
            }
        })();
    }, [])

    const navigate = useNavigate();

    const login = async (username: string, password: string) => {
        try {
            await loginRequest(username, password);
            const user = await getProfile();
            setProfile(user);
            navigate("/dashboard");
        } catch (error: any) {
            toast(error.message);
        }
    };

    const logout = () => {
        document.cookie.split(";").forEach(function (c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });
        setProfile(undefined);
        navigate("/dashboard/login", { replace: true });
    };

    const value = useMemo(
        () => ({
            profile,
            login,
            logout,
        }),
        [profile]
    );
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
