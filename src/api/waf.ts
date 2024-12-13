import { ModelWAFApiMock } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const deleteWAF = async (ip: string[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, "/api/v1/batch-delete/waf", ip)
}

export const getWAFList = async (): Promise<ModelWAFApiMock[]> => {
    return fetcher<ModelWAFApiMock[]>(FetcherMethod.GET, "/api/v1/waf", null)
}
