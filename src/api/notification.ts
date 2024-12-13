import { ModelNotification, ModelNotificationForm } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const createNotification = async (data: ModelNotificationForm): Promise<number> => {
    return fetcher<number>(FetcherMethod.POST, "/api/v1/notification", data)
}

export const updateNotification = async (
    id: number,
    data: ModelNotificationForm,
): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/notification/${id}`, data)
}

export const deleteNotification = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, "/api/v1/batch-delete/notification", id)
}

export const getNotification = async (): Promise<ModelNotification[]> => {
    return fetcher<ModelNotification[]>(FetcherMethod.GET, "/api/v1/notification", null)
}
