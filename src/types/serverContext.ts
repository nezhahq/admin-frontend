import { ModelServerGroupResponseItem, ServerIdentifierType } from "@/types"

export interface ServerContextProps {
    servers?: ServerIdentifierType[]
    serverGroups?: ModelServerGroupResponseItem[]
}
