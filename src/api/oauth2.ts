import { ModelOauth2LoginResponse } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export enum Oauth2RequestType {
    LOGIN = 1,
    BIND = 2,
}

export const getOauth2RedirectURL = async (
    provider: string,
    rType: Oauth2RequestType,
): Promise<ModelOauth2LoginResponse> => {
    return fetcher<ModelOauth2LoginResponse>(FetcherMethod.GET, `/api/v1/oauth2/${provider}`, {
        type: rType,
    })
}

export const unbindOauth2 = async (provider: string): Promise<ModelOauth2LoginResponse> => {
    return fetcher<ModelOauth2LoginResponse>(
        FetcherMethod.POST,
        `/api/v1/oauth2/${provider}/unbind`,
    )
}
