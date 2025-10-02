import { Button, ButtonProps } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/useAuth"
import useSettings from "@/hooks/useSetting"
import { copyToClipboard } from "@/lib/utils"
import { ModelProfile, ModelSetting } from "@/types"
import i18next from "i18next"
import { Check, Copy, Download } from "lucide-react"
import { forwardRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

enum OSTypes {
    Linux = 1,
    macOS,
    Windows,
}

type InstallCommandsMenuProps = ButtonProps & {
    uuid?: string
    iconOnly?: boolean
    menuItem?: boolean
}

export const InstallCommandsMenu = forwardRef<HTMLButtonElement, InstallCommandsMenuProps>(
    ({ uuid, iconOnly = false, menuItem = false, ...props }, ref) => {
        const [copy, setCopy] = useState(false)
        const { data: settings } = useSettings()
        const { profile } = useAuth()

        const { t } = useTranslation()

        const switchState = async (type: number) => {
            if (!copy) {
                try {
                    setCopy(true)
                    if (!profile) throw new Error("Profile is not found.")
                    if (!settings?.config) throw new Error("Settings is not found.")
                    await copyToClipboard(
                        generateCommand(type, settings!.config, profile, uuid) || "",
                    )
                } catch (e: Error | any) {
                    console.error(e)
                    toast(t("Error"), {
                        description: e.message,
                    })
                } finally {
                    setTimeout(() => {
                        setCopy(false)
                    }, 2 * 1000)
                }
            }
        }

        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    {menuItem ? (
                        <button
                            type="button"
                            className="flex w-full items-center text-sm px-2 py-2 hover:bg-accent hover:text-accent-foreground"
                            title={i18next.t("InstallCommands")}
                        >
                            {copy ? (
                                <Check className="h-4 w-4 mr-2" />
                            ) : (
                                <Copy className="h-4 w-4 mr-2" />
                            )}
                            <span>{i18next.t("InstallCommands")}</span>
                        </button>
                    ) : iconOnly ? (
                        <Button
                            ref={ref}
                            title={i18next.t("InstallCommands")}
                            size="icon"
                            {...props}
                        >
                            {copy ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                        </Button>
                    ) : (
                        <Button ref={ref} title={i18next.t("InstallCommands")} {...props}>
                            {copy ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            <span className="ml-2">{i18next.t("InstallCommands")}</span>
                        </Button>
                    )}
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    side={menuItem ? "right" : undefined}
                    align={menuItem ? "start" : undefined}
                >
                    <DropdownMenuItem
                        className="nezha-copy"
                        onClick={async () => {
                            switchState(OSTypes.Linux)
                        }}
                    >
                        Linux
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="nezha-copy"
                        onClick={async () => {
                            switchState(OSTypes.macOS)
                        }}
                    >
                        macOS
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        className="nezha-copy"
                        onClick={async () => {
                            switchState(OSTypes.Windows)
                        }}
                    >
                        Windows
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        )
    },
)

const generateCommand = (
    type: number,
    { install_host, tls }: ModelSetting,
    { agent_secret }: ModelProfile,
    uuid?: string,
) => {
    if (!install_host) throw new Error(i18next.t("Results.InstallHostRequired"))

    if (!agent_secret) throw new Error(i18next.t("Results.AgentSecretRequired"))

    const envParts = [
        `NZ_SERVER=${install_host}`,
        `NZ_TLS=${tls || false}`,
        `NZ_CLIENT_SECRET=${agent_secret}`,
    ]
    if (uuid) envParts.push(`NZ_UUID=${uuid}`)
    const env = envParts.join(" ")

    const envWinParts = [
        `$env:NZ_SERVER=\"${install_host}\";`,
        `$env:NZ_TLS=\"${tls || false}\";`,
        `$env:NZ_CLIENT_SECRET=\"${agent_secret}\";`,
    ]
    if (uuid) envWinParts.push(`$env:NZ_UUID=\"${uuid}\";`)
    const env_win = envWinParts.join("")

    switch (type) {
        case OSTypes.Linux:
        case OSTypes.macOS: {
            return `curl -L https://raw.githubusercontent.com/nezhahq/scripts/main/agent/install.sh -o agent.sh && chmod +x agent.sh && env ${env} ./agent.sh`
        }
        case OSTypes.Windows: {
            return `${env_win} [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Ssl3 -bor [Net.SecurityProtocolType]::Tls -bor [Net.SecurityProtocolType]::Tls11 -bor [Net.SecurityProtocolType]::Tls12;set-ExecutionPolicy RemoteSigned;Invoke-WebRequest https://raw.githubusercontent.com/nezhahq/scripts/main/agent/install.ps1 -OutFile C:\install.ps1;powershell.exe C:\install.ps1`
        }
        default: {
            throw new Error(`Unknown OS: ${type}`)
        }
    }
}
