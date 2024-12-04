import { ModelSettingForm, ModelSettingResponse } from "@/types"
import { fetcher, FetcherMethod } from "./api"

export const updateSettings = async (data: ModelSettingForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/setting`, data);
}

export const getSettings = async (): Promise<ModelSettingResponse> => {
    return fetcher<ModelSettingResponse>(FetcherMethod.GET, '/api/v1/setting', null);
}
