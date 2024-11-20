import { ModelCreateTerminalResponse } from "@/types";
import { fetcher, FetcherMethod } from "./api"

export const createTerminal = async (id: number): Promise<ModelCreateTerminalResponse> => {
    return fetcher<ModelCreateTerminalResponse>(FetcherMethod.POST, '/api/v1/terminal', {
        server_id: id,
    });
}
