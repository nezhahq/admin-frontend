import { ModelNATForm } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const createNAT = async (data: ModelNATForm): Promise<number> => {
    return fetcher<number>(FetcherMethod.POST, "/api/v1/nat", data)
}

export const updateNAT = async (id: number, data: ModelNATForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/nat/${id}`, data)
}

export const deleteNAT = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, "/api/v1/batch-delete/nat", id)
}
