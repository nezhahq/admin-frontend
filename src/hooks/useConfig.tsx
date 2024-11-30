import { createContext, useContext, useEffect, useMemo } from "react"
import { useConfigStore } from "./useConfigStore"
import { getSettings } from "@/api/settings"
import { ConfigContextProps } from "@/types"
import { useLocation } from "react-router-dom"

const ConfigContext = createContext<ConfigContextProps>({});

interface ConfigProviderProps {
    children: React.ReactNode;
}

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
    const config = useConfigStore(store => store.config);
    const setConfig = useConfigStore(store => store.setConfig);

    const location = useLocation();

    useEffect(() => {
        (async () => {
            if (location.pathname !== "/dashboard/settings")
                try {
                    const c = await getSettings();
                    const { agent_secret_key, language, listen_port, install_host, site_name, tls } = c;
                    const data = {
                        agent_secret_key,
                        language,
                        listen_port,
                        install_host,
                        site_name,
                        tls,
                    };
                    setConfig(data);
                } catch (error) {
                    setConfig(undefined);
                }
        })();
    }, [location.pathname])

    const value: ConfigContextProps = useMemo(() => ({
        config: config,
    }), [config]);
    return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export const useConfig = () => {
    return useContext(ConfigContext);
};
