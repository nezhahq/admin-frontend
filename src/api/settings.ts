import { ModelSettingForm } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const updateSettings = async (data: ModelSettingForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/setting`, data)
}
