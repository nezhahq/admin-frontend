import { createContext, useContext, useEffect, useMemo } from "react"
import { useServerStore } from "./useServerStore"
import { getServerGroups } from "@/api/server-group"
import { getServers } from "@/api/server"
import { ServerContextProps } from "@/types"

const ServerContext = createContext<ServerContextProps>({});

interface ServerProviderProps {
    children: React.ReactNode;
    withServer?: boolean;
    withServerGroup?: boolean;
}

export const ServerProvider: React.FC<ServerProviderProps> = ({ children, withServer, withServerGroup }) => {
    const serverGroup = useServerStore(store => store.serverGroup);
    const setServerGroup = useServerStore(store => store.setServerGroup);

    const server = useServerStore(store => store.server);
    const setServer = useServerStore(store => store.setServer);

    useEffect(() => {
        if (withServerGroup)
            (async () => {
                try {
                    const sg = await getServerGroups();
                    setServerGroup(sg);
                } catch (error) {
                    setServerGroup(undefined);
                }
            })();
        if (withServer)
            (async () => {
                try {
                    const s = await getServers();
                    setServer(s);
                } catch (error) {
                    setServer(undefined);
                }
            })();
    }, [])

    const value: ServerContextProps = useMemo(() => ({
        servers: server,
        serverGroups: serverGroup,
    }), [server, serverGroup]);
    return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
}

export const useServer = () => {
    return useContext(ServerContext);
};
