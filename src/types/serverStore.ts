import { ModelServer, ModelServerGroupResponseItem } from "@/types";

export interface ServerStore {
    server?: ModelServer[];
    serverGroup?: ModelServerGroupResponseItem[];
    setServer: (server?: ModelServer[]) => void;
    setServerGroup: (serverGroup?: ModelServerGroupResponseItem[]) => void;
}
