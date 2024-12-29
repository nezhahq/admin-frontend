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
    const sType = "type"
    return fetcher<ModelOauth2LoginResponse>(FetcherMethod.GET, `/api/v1/oauth2/${provider}`, {
        sType: rType,
    })
}

export const bindOauth2 = async (
    provider: string,
    state: string,
    code: string,
): Promise<ModelOauth2LoginResponse> => {
    return fetcher<ModelOauth2LoginResponse>(
        FetcherMethod.POST,
        `/api/v1/oauth2/${provider}/bind`,
        {
            state: state,
            code: code,
        },
    )
}

export const unbindOauth2 = async (provider: string): Promise<ModelOauth2LoginResponse> => {
    return fetcher<ModelOauth2LoginResponse>(
        FetcherMethod.POST,
        `/api/v1/oauth2/${provider}/unbind`,
    )
}

export const oauth2callback = async (
    provider: string,
    state: string,
    code: string,
): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, `/api/v1/oauth2/${provider}/callback`, {
        state,
        code,
    })
}
