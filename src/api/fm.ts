import { ModelCreateFMResponse } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const createFM = async (id: string): Promise<ModelCreateFMResponse> => {
    return fetcher<ModelCreateFMResponse>(FetcherMethod.GET, `/api/v1/file?id=${id}`, null)
}
