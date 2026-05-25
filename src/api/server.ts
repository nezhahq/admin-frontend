import {
    ModelBatchMoveServerForm,
    ModelBatchMoveServerResult,
    ModelServer,
    ModelServerConfigForm,
    ModelServerForm,
    ModelServerTaskResponse,
} from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const updateServer = async (id: number, data: ModelServerForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/server/${id}`, data)
}

export const deleteServer = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, "/api/v1/batch-delete/server", id)
}

// batchMoveServer kicks off one ServerTransfer per id and returns a per-id
// result. The dashboard previously returned void from this endpoint; the new
// response shape carries the transfer ID for callers that want to subscribe
// to /ws/transfer for state changes, plus structured non-pending statuses
// (permission_denied, already_transferring, server_not_found, same_owner)
// that the UI can render without parsing prose error messages.
export const batchMoveServer = async (
    data: ModelBatchMoveServerForm,
): Promise<ModelBatchMoveServerResult[]> => {
    return fetcher<ModelBatchMoveServerResult[]>(FetcherMethod.POST, "/api/v1/batch-move/server", data)
}

export const forceUpdateServer = async (id: number[]): Promise<ModelServerTaskResponse> => {
    return fetcher<ModelServerTaskResponse>(FetcherMethod.POST, "/api/v1/force-update/server", id)
}

export const getServers = async (): Promise<ModelServer[]> => {
    return fetcher<ModelServer[]>(FetcherMethod.GET, "/api/v1/server", null)
}

export const getServerConfig = async (id: number): Promise<string> => {
    return fetcher<string>(FetcherMethod.GET, `/api/v1/server/config/${id}`, null)
}

export const setServerConfig = async (
    data: ModelServerConfigForm,
): Promise<ModelServerTaskResponse> => {
    return fetcher<ModelServerTaskResponse>(FetcherMethod.POST, `/api/v1/server/config`, data)
}
