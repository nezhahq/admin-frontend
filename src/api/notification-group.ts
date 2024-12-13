import { ModelNotificationGroupForm, ModelNotificationGroupResponseItem } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const createNotificationGroup = async (
    data: ModelNotificationGroupForm,
): Promise<number> => {
    return fetcher<number>(FetcherMethod.POST, "/api/v1/notification-group", data)
}

export const updateNotificationGroup = async (
    id: number,
    data: ModelNotificationGroupForm,
): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/notification-group/${id}`, data)
}

export const deleteNotificationGroups = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, `/api/v1/batch-delete/notification-group`, id)
}

export const getNotificationGroups = async (): Promise<ModelNotificationGroupResponseItem[]> => {
    return fetcher<ModelNotificationGroupResponseItem[]>(
        FetcherMethod.GET,
        "/api/v1/notification-group",
        null,
    )
}
