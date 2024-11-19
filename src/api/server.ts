import { ModelServer, ModelServerForm } from "@/types"
import { fetcher, FetcherMethod } from "./api"

export const updateServer = async (id: number, data: ModelServerForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/server/${id}`, data)
}

export const deleteServer = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, '/api/v1/batch-delete/server', id)
}

export const getServers = async (): Promise<ModelServer[]> => {
    return fetcher<ModelServer[]>(FetcherMethod.GET, '/api/v1/server', null)
}
