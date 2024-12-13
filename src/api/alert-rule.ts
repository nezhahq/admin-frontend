import { ModelAlertRuleForm } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const createAlertRule = async (data: ModelAlertRuleForm): Promise<number> => {
    return fetcher<number>(FetcherMethod.POST, "/api/v1/alert-rule", data)
}

export const updateAlertRule = async (id: number, data: ModelAlertRuleForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/alert-rule/${id}`, data)
}

export const deleteAlertRules = async (id: number[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, "/api/v1/batch-delete/alert-rule", id)
}
