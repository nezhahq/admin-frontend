import { ModelDDNSForm } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const createDDNSProfile = async (data: ModelDDNSForm): Promise<number> => {
    return fetcher<number>(FetcherMethod.POST, "/api/v1/ddns", data)
}

export const updateDDNSProfile = async (id: number, data: ModelDDNSForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/ddns/${id}`, data)
}

export const deleteDDNSProfiles = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, "/api/v1/batch-delete/ddns", id)
}

export const getDDNSProviders = async (): Promise<string[]> => {
    return fetcher<string[]>(FetcherMethod.GET, "/api/v1/ddns/providers", null)
}
