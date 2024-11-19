import { ModelNotificationGroupForm } from "@/types"
import { fetcher, FetcherMethod } from "./api"

export const createNotificationGroup = async (data: ModelNotificationGroupForm): Promise<number> => {
    return fetcher<number>(FetcherMethod.POST, '/api/v1/notification-group', data);
}

export const updateNotificationGroup = async (id: number, data: ModelNotificationGroupForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/notification-group/${id}`, data);
}

export const deleteNotificationGroups = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, `/api/v1/batch-delete/notification-group`, id)
}
