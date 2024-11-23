import { ModelWAF } from "@/types"
import { fetcher, FetcherMethod } from "./api"

export const deleteWAF = async (ip: string[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, '/api/v1/batch-delete/waf', ip);
}

export const getWAFList = async (): Promise<ModelWAF[]> => {
    return fetcher<ModelWAF[]>(FetcherMethod.GET, '/api/v1/waf', null);
}
