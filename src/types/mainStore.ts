import { ModelUser } from "@/types";

export interface MainStore {
    profile: ModelUser | undefined;
    setProfile: (profile: ModelUser | undefined) => void;
}
