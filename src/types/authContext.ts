import { ModelUser } from "@/types";

export interface AuthContextProps {
    profile: ModelUser | undefined;
    login: (username: string, password: string) => void;
    logout: () => void;
}