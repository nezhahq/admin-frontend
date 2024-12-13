import { ModelServiceForm } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const createService = async (data: ModelServiceForm): Promise<number> => {
    return fetcher<number>(FetcherMethod.POST, "/api/v1/service", data)
}

export const updateService = async (id: number, data: ModelServiceForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/service/${id}`, data)
}

export const deleteService = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, "/api/v1/batch-delete/service", id)
}
