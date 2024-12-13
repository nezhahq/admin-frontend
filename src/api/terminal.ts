import { ModelCreateTerminalResponse } from "@/types"

import { FetcherMethod, fetcher } from "./api"

export const createTerminal = async (id: number): Promise<ModelCreateTerminalResponse> => {
    return fetcher<ModelCreateTerminalResponse>(FetcherMethod.POST, "/api/v1/terminal", {
        server_id: id,
    })
}
