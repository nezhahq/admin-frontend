import { swrFetcher } from "@/api/api";
import { ModelConfig } from "@/types";
import useSWR from "swr";

export default function useSetting() {
    const { data } = useSWR<ModelConfig>(
        "/api/v1/setting",
        swrFetcher
    );
    return data;
}
