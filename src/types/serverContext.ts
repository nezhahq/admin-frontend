import { ModelServerGroupResponseItem, ModelServer } from "@/types";

export interface ServerContextProps {
    servers?: ModelServer[];
    serverGroups?: ModelServerGroupResponseItem[];
}
