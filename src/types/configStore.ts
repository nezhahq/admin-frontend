export interface ConfigEssential {
    language: string;
    agent_secret_key: string;
    install_host: string;
    listen_port: number;
    site_name: string;
    tls: boolean;
}

export interface ConfigStore {
    config?: ConfigEssential;
    setConfig: (config?: ConfigEssential) => void;
}
