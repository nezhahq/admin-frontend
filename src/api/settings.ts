import { ModelSettingForm, ModelConfig } from "@/types"
import { fetcher, FetcherMethod } from "./api"

export const updateSettings = async (data: ModelSettingForm): Promise<void> => {
    return fetcher<void>(FetcherMethod.PATCH, `/api/v1/setting`, data);
}

export const getSettings = async (): Promise<ModelConfig> => {
    return fetcher<ModelConfig>(FetcherMethod.GET, '/api/v1/setting', null);
}
