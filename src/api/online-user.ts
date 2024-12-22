import { FetcherMethod, fetcher } from "./api"

export const blockUser = async (ip: string[]): Promise<void> => {
    return fetcher<void>(FetcherMethod.POST, "/api/v1/online-user/batch-block", ip)
}
