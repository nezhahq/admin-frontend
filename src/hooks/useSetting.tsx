import { swrFetcher } from "@/api/api"
import { GithubComNezhahqNezhaModelSettingResponseModelConfig } from "@/types"
import useSWR from "swr"

export default function useSetting() {
    return useSWR<GithubComNezhahqNezhaModelSettingResponseModelConfig>(
        "/api/v1/setting",
        swrFetcher,
    )
}
