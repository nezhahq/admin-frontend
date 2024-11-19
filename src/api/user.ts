import { ModelUser } from "@/types"
import { fetcher, FetcherMethod } from "./api"

export const getProfile = async (): Promise<ModelUser> => {
    return fetcher<ModelUser>(FetcherMethod.GET, '/api/v1/profile', null);
}

export const login = async (username: string, password: string): Promise<any> => {
    return fetcher<any>(FetcherMethod.POST, '/api/v1/login', { username, password });
}
