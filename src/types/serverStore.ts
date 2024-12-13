import { ModelServerGroupResponseItem } from "@/types"

export interface ServerIdentifierType {
    id: number
    name: string
}

export interface ServerStore {
    server?: ServerIdentifierType[]
    serverGroup?: ModelServerGroupResponseItem[]
    setServer: (server?: ServerIdentifierType[]) => void
    setServerGroup: (serverGroup?: ModelServerGroupResponseItem[]) => void
}
