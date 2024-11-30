import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button, ButtonProps } from "@/components/ui/button"
import { forwardRef, useState } from "react"
import useSettings from "@/hooks/useSetting"
import { ModelConfig } from "@/types"
import { Check, Clipboard } from "lucide-react"
import { toast } from "sonner"

import { useTranslation } from "react-i18next"

enum OSTypes {
    Linux = 1,
    macOS,
    Windows
}

export const InstallCommandsMenu = forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
    const [copy, setCopy] = useState(false);
    const settings = useSettings();
    const { t } = useTranslation();

    const switchState = async (type: number) => {
        if (!copy) {
            try {
                setCopy(true);
                if (config)
                    await navigator.clipboard.writeText(generateCommand(type, settings) || '');
            } catch (e) {
                console.error(e);
                toast(t("Error"), {
                    description: t("Results.UnExpectedError"),
                })
            } finally {
                setTimeout(() => {
                    setCopy(false);
                }, 2 * 1000);
            }
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button {...props} ref={ref}>
                    {copy ? <Check /> : <Clipboard />}
                    {t("InstallCommands")}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={async () => { switchState(OSTypes.Linux) }}>Linux</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { switchState(OSTypes.macOS) }}>macOS</DropdownMenuItem>
                <DropdownMenuItem onClick={async () => { switchState(OSTypes.Windows) }}>Windows</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
})

const generateCommand = (type: number, { agent_secret_key, install_host, listen_port, tls }: ModelConfig) => {
    if (!install_host)
        throw new Error("You have not specify the installed host.");

    const env = `NZ_SERVER=${install_host}:${listen_port} NZ_TLS=${tls || false} NZ_CLIENT_SECRET=${agent_secret_key}`;

    switch (type) {
        case OSTypes.Linux:
        case OSTypes.macOS: {
            return `curl -L https://raw.githubusercontent.com/nezhahq/scripts/main/agent/install.sh -o nezha.sh && chmod +x nezha.sh && env ${env} ./nezha.sh`
        }
        case OSTypes.Windows: {
            return `${env} [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Ssl3 -bor [Net.SecurityProtocolType]::Tls -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls12;set-ExecutionPolicy RemoteSigned;Invoke-WebRequest https://raw.githubusercontent.com/nezhahq/scripts/main/agent/install.ps1 -OutFile C:\install.ps1;powershell.exe C:\install.ps1`
        }
        default: {
            throw new Error(`Unknown OS: ${type}`);
        }
    }
}
