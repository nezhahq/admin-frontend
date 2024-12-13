import { ModelServerGroupForm, ModelServerGroupResponseItem } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const createServerGroup = async (data: ModelServerGroupForm): Promise<number> => {
    return fetcher<number>(FetcherMethod.POST, "/api/v1/server-group", data)
}

export const updateServerGroup = async (id: number, data: ModelServerGroupForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/server-group/${id}`, data)
}

export const deleteServerGroups = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, `/api/v1/batch-delete/server-group`, id)
}

export const getServerGroups = async (): Promise<ModelServerGroupResponseItem[]> => {
    return fetcher<ModelServerGroupResponseItem[]>(FetcherMethod.GET, "/api/v1/server-group", null)
}
