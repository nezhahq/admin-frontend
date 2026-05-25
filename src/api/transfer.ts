import { ModelServerTransfer } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const getServerTransfers = async (): Promise<ModelServerTransfer[]> => {
    return fetcher<ModelServerTransfer[]>(FetcherMethod.GET, "/api/v1/transfer", null)
}

export const cancelServerTransfer = async (id: number): Promise<ModelServerTransfer> => {
    return fetcher<ModelServerTransfer>(FetcherMethod.POST, `/api/v1/transfer/${id}/cancel`)
}

export const retryServerTransfer = async (id: number): Promise<ModelServerTransfer> => {
    return fetcher<ModelServerTransfer>(FetcherMethod.POST, `/api/v1/transfer/${id}/retry`)
}
