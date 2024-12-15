import { swrFetcher } from "@/api/api"
import { ModelSettingResponse } from "@/types"
import useSWR from "swr"

export default function useSetting() {
    return useSWR<ModelSettingResponse>("/api/v1/setting", swrFetcher)
}
