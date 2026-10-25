import { MCPOAuthConsentInfo, getMCPOAuthConsent, submitMCPOAuthConsent } from "@/api/mcp-oauth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { followMCPOAuthCallback } from "@/lib/mcp-oauth-navigation"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"

const scopeLabels: Record<string, string> = {
    "nezha:inventory:read": "MCPOAuth.ReadInventory",
    "nezha:server:read": "MCPOAuth.ReadServer",
    "nezha:server:write": "MCPOAuth.WriteServer",
    "nezha:server:delete": "MCPOAuth.DeleteFiles",
    "nezha:server:exec": "MCPOAuth.ExecuteCommands",
}

export default function MCPOAuthAuthorizePage() {
    const { t } = useTranslation()
    const { profile } = useAuth()
    const { search } = useLocation()
    const [info, setInfo] = useState<MCPOAuthConsentInfo>()
    const [scopes, setScopes] = useState<string[]>([])
    const [serverIDs, setServerIDs] = useState<number[]>([])
    const [allServers, setAllServers] = useState(false)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        let active = true
        setInfo(undefined)
        setError("")
        setServerIDs([])
        setAllServers(false)
        getMCPOAuthConsent(search)
            .then((result) => {
                if (!active) return
                setInfo(result)
                setScopes(result.scopes.filter((scope) => scope.endsWith(":read")))
            })
            .catch((error: unknown) => {
                if (active) setError(error instanceof Error ? error.message : String(error))
            })
        return () => {
            active = false
        }
    }, [search, profile?.id])

    async function decide(approve: boolean) {
        if (!info || busy) return
        setBusy(true)
        setError("")
        try {
            const result = await submitMCPOAuthConsent({
                consent_token: info.consent_token,
                approve,
                scopes,
                server_ids: allServers ? [] : serverIDs,
                all_servers: allServers,
            })
            followMCPOAuthCallback(result.redirect_uri, info.redirect_uri)
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error))
            setBusy(false)
        }
    }

    return (
        <div className="mx-auto max-w-2xl px-3 py-8">
            <Card>
                <CardContent className="space-y-6 pt-6">
                    <h1 className="text-xl font-semibold">{t("MCPOAuth.Title")}</h1>
                    {error && (
                        <p role="alert" className="text-destructive">
                            {error}
                        </p>
                    )}
                    {!info && !error && <p role="status">{t("MCPOAuth.Loading")}</p>}
                    {info && (
                        <>
                            <div className="space-y-2 break-words">
                                <p>{t("MCPOAuth.Client", { name: info.client_name })}</p>
                                <p className="text-muted-foreground">
                                    {t("MCPOAuth.UnverifiedClient")}
                                </p>
                                <p>{t("MCPOAuth.Account", { name: profile?.username })}</p>
                                <p>
                                    {t("MCPOAuth.Callback")}: <code>{info.redirect_uri}</code>
                                </p>
                                <p>
                                    {t("MCPOAuth.Resource")}: <code>{info.resource}</code>
                                </p>
                            </div>
                            <fieldset disabled={busy} className="space-y-3">
                                <legend className="mb-3 font-medium">
                                    {t("MCPOAuth.Permissions")}
                                </legend>
                                {info.scopes.map((scope) => (
                                    <label key={scope} className="flex items-start gap-2">
                                        <input
                                            type="checkbox"
                                            checked={scopes.includes(scope)}
                                            onChange={(event) =>
                                                setScopes(
                                                    event.target.checked
                                                        ? [...scopes, scope]
                                                        : scopes.filter((value) => value !== scope),
                                                )
                                            }
                                        />
                                        <span>{t(scopeLabels[scope] ?? scope)}</span>
                                    </label>
                                ))}
                            </fieldset>
                            <fieldset disabled={busy} className="space-y-3">
                                <legend className="mb-3 font-medium">
                                    {t("MCPOAuth.Servers")}
                                </legend>
                                <label className="flex items-start gap-2">
                                    <input
                                        type="checkbox"
                                        checked={allServers}
                                        onChange={(event) => setAllServers(event.target.checked)}
                                    />
                                    <span>{t("MCPOAuth.AllServers")}</span>
                                </label>
                                {!allServers &&
                                    info.servers.map((server) => (
                                        <label key={server.id} className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                checked={serverIDs.includes(server.id)}
                                                onChange={(event) =>
                                                    setServerIDs(
                                                        event.target.checked
                                                            ? [...serverIDs, server.id]
                                                            : serverIDs.filter(
                                                                  (id) => id !== server.id,
                                                              ),
                                                    )
                                                }
                                            />
                                            <span>
                                                {server.name} (#{server.id})
                                            </span>
                                        </label>
                                    ))}
                                {!allServers && info.servers.length === 0 && (
                                    <p>{t("MCPOAuth.NoServers")}</p>
                                )}
                            </fieldset>
                            <p className="text-muted-foreground">{t("MCPOAuth.RevokeHint")}</p>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() => decide(false)}
                                >
                                    {t("MCPOAuth.Deny")}
                                </Button>
                                <Button
                                    disabled={
                                        busy ||
                                        scopes.length === 0 ||
                                        (!allServers && serverIDs.length === 0)
                                    }
                                    onClick={() => decide(true)}
                                >
                                    {t("MCPOAuth.Allow")}
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
