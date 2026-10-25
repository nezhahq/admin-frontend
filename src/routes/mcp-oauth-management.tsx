import {
    listMCPOAuthClients,
    listMCPOAuthGrants,
    revokeMCPOAuthGrant,
    setMCPOAuthClientDisabled,
} from "@/api/mcp-oauth"
import { SettingsTab } from "@/components/settings-tab"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/useAuth"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import useSWR, { useSWRConfig } from "swr"

function displayTime(value?: string) {
    return value ? new Date(value).toLocaleString() : "—"
}

function errorMessage(error: unknown) {
    return error instanceof Error ? error.message : String(error)
}

function OAuthPagination({
    page,
    total,
    busy,
    onChange,
}: {
    page: number
    total: number
    busy: boolean
    onChange: (page: number) => void
}) {
    const { t } = useTranslation()
    return (
        <div className="flex flex-wrap items-center justify-end gap-3 py-4">
            <span className="text-sm text-muted-foreground">
                {t("MCPOAuthManager.Pagination", { page, total })}
            </span>
            <Button
                variant="outline"
                disabled={busy || page <= 1}
                onClick={() => onChange(page - 1)}
            >
                {t("MCPOAuthManager.Previous")}
            </Button>
            <Button
                variant="outline"
                disabled={busy || page * 20 >= total}
                onClick={() => onChange(page + 1)}
            >
                {t("MCPOAuthManager.Next")}
            </Button>
        </div>
    )
}

function OAuthGrants({ all, userID }: { all: boolean; userID: number }) {
    const { t } = useTranslation()
    const [page, setPage] = useState(1)
    const [busy, setBusy] = useState(false)
    const [actionError, setActionError] = useState("")
    // Include the signed-in identity in cache keys to avoid showing the previous
    // user's authorization metadata after an account switch in the same browser.
    const { data, error, isLoading, mutate } = useSWR(["mcp-oauth-grants", userID, all, page], () =>
        listMCPOAuthGrants(all, page),
    )
    async function revoke(id: string, name: string) {
        if (busy || !window.confirm(t("MCPOAuthManager.ConfirmRevoke", { name }))) return
        setBusy(true)
        setActionError("")
        try {
            await revokeMCPOAuthGrant(id)
            await mutate()
        } catch (error) {
            setActionError(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }
    return (
        <>
            {(actionError || error) && (
                <p role="alert" className="text-destructive">
                    {actionError || errorMessage(error)}
                </p>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("MCPOAuthManager.Application")}</TableHead>
                        {all && <TableHead>{t("User")}</TableHead>}
                        <TableHead>{t("MCPOAuth.Permissions")}</TableHead>
                        <TableHead>{t("MCPOAuth.Servers")}</TableHead>
                        <TableHead>{t("MCPOAuthManager.Lifetime")}</TableHead>
                        <TableHead>{t("ApiTokenLastUsed")}</TableHead>
                        <TableHead>{t("Actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data?.items ?? []).map((grant) => (
                        <TableRow key={grant.id}>
                            <TableCell className="max-w-64 break-all whitespace-normal">
                                <p>{grant.client_name || grant.client_id}</p>
                                <p className="text-xs text-muted-foreground">{grant.client_id}</p>
                                <p>{t(`MCPOAuthManager.Status.${grant.status}`)}</p>
                            </TableCell>
                            {all && (
                                <TableCell>
                                    {grant.username} (#{grant.user_id})
                                </TableCell>
                            )}
                            <TableCell className="whitespace-normal">
                                {grant.scopes.map((scope) => (
                                    <div key={scope} className="text-xs">
                                        {scope}
                                    </div>
                                ))}
                            </TableCell>
                            <TableCell className="max-w-48 break-words whitespace-normal">
                                {grant.server_ids.length
                                    ? grant.server_ids.join(", ")
                                    : t("MCPOAuth.AllServers")}
                            </TableCell>
                            <TableCell className="text-xs">
                                <p>
                                    {t("MCPOAuthManager.AuthorizedAt")}:{" "}
                                    {displayTime(grant.created_at)}
                                </p>
                                <p>
                                    {t("ApiTokenExpiresAt")}: {displayTime(grant.expires_at)}
                                </p>
                            </TableCell>
                            <TableCell className="text-xs">
                                <p>{displayTime(grant.last_used_at)}</p>
                                <p>{grant.last_used_ip}</p>
                            </TableCell>
                            <TableCell>
                                <Button
                                    variant="destructive"
                                    disabled={busy}
                                    onClick={() =>
                                        revoke(grant.id, grant.client_name || grant.client_id)
                                    }
                                >
                                    {t("Revoke")}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {isLoading && (
                <p role="status" className="py-4">
                    {t("Loading")}
                </p>
            )}
            {!isLoading && !error && data?.items.length === 0 && (
                <p className="py-4">{t("NoResults")}</p>
            )}
            <OAuthPagination
                page={page}
                total={data?.total ?? 0}
                busy={busy || isLoading}
                onChange={setPage}
            />
        </>
    )
}

function OAuthClients({ userID }: { userID: number }) {
    const { t } = useTranslation()
    const [page, setPage] = useState(1)
    const [busy, setBusy] = useState(false)
    const [actionError, setActionError] = useState("")
    const { mutate: mutateCache } = useSWRConfig()
    const { data, error, isLoading, mutate } = useSWR(["mcp-oauth-clients", userID, page], () =>
        listMCPOAuthClients(page),
    )
    async function changeClient(id: string, name: string, disabled: boolean) {
        const confirmation = disabled
            ? "MCPOAuthManager.ConfirmDisable"
            : "MCPOAuthManager.ConfirmEnable"
        if (busy || !window.confirm(t(confirmation, { name }))) return
        setBusy(true)
        setActionError("")
        try {
            await setMCPOAuthClientDisabled(id, disabled)
            await mutate()
            await mutateCache(
                (key) => Array.isArray(key) && key[0] === "mcp-oauth-grants",
                undefined,
            )
        } catch (error) {
            setActionError(errorMessage(error))
        } finally {
            setBusy(false)
        }
    }
    return (
        <>
            <p className="mb-4 text-sm text-muted-foreground">
                {t("MCPOAuthManager.ClientPolicy")}
            </p>
            {(actionError || error) && (
                <p role="alert" className="text-destructive">
                    {actionError || errorMessage(error)}
                </p>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("MCPOAuthManager.Application")}</TableHead>
                        <TableHead>{t("MCPOAuth.Callback")}</TableHead>
                        <TableHead>{t("MCPOAuthManager.GrantCount")}</TableHead>
                        <TableHead>{t("ApiTokenLastUsed")}</TableHead>
                        <TableHead>{t("Actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {(data?.items ?? []).map((client) => (
                        <TableRow key={client.id}>
                            <TableCell className="max-w-64 break-all whitespace-normal">
                                <p>{client.name}</p>
                                <p className="text-xs text-muted-foreground">{client.id}</p>
                                <p>
                                    {t(
                                        client.disabled
                                            ? "MCPOAuthManager.Disabled"
                                            : "MCPOAuthManager.Enabled",
                                    )}
                                </p>
                            </TableCell>
                            <TableCell className="max-w-96 break-all whitespace-normal">
                                {client.redirect_uris.map((uri) => (
                                    <div key={uri} className="text-xs">
                                        {uri}
                                    </div>
                                ))}
                            </TableCell>
                            <TableCell>{client.grant_count}</TableCell>
                            <TableCell>{displayTime(client.last_used_at)}</TableCell>
                            <TableCell>
                                <Button
                                    variant={client.disabled ? "outline" : "destructive"}
                                    disabled={busy}
                                    onClick={() =>
                                        changeClient(client.id, client.name, !client.disabled)
                                    }
                                >
                                    {t(
                                        client.disabled
                                            ? "MCPOAuthManager.Enable"
                                            : "MCPOAuthManager.Disable",
                                    )}
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {isLoading && (
                <p role="status" className="py-4">
                    {t("Loading")}
                </p>
            )}
            {!isLoading && !error && data?.items.length === 0 && (
                <p className="py-4">{t("NoResults")}</p>
            )}
            <OAuthPagination
                page={page}
                total={data?.total ?? 0}
                busy={busy || isLoading}
                onChange={setPage}
            />
        </>
    )
}

export default function MCPOAuthManagementPage() {
    const { t } = useTranslation()
    const { profile, loading } = useAuth()
    const [view, setView] = useState("mine")
    const isAdmin = profile?.role === 0
    const selected = isAdmin ? view : "mine"
    return (
        <div className="px-3">
            <SettingsTab className="mt-6 w-full" />
            <h2 className="mt-4 text-lg font-semibold">{t("MCPOAuthManager.Title")}</h2>
            <p className="my-3 text-sm text-muted-foreground">{t("MCPOAuthManager.Description")}</p>
            {loading || !profile ? (
                <p role="status">{t("Loading")}</p>
            ) : (
                <>
                    <Tabs value={selected} onValueChange={setView} className="mb-4">
                        <TabsList>
                            <TabsTrigger value="mine">{t("MCPOAuthManager.Mine")}</TabsTrigger>
                            {isAdmin && (
                                <TabsTrigger value="all">{t("MCPOAuthManager.All")}</TabsTrigger>
                            )}
                            {isAdmin && (
                                <TabsTrigger value="clients">
                                    {t("MCPOAuthManager.Clients")}
                                </TabsTrigger>
                            )}
                        </TabsList>
                    </Tabs>
                    {selected === "clients" && isAdmin ? (
                        <OAuthClients key={`clients-${profile.id}`} userID={profile.id} />
                    ) : (
                        <OAuthGrants
                            key={`${profile.id}-${selected}`}
                            userID={profile.id}
                            all={selected === "all"}
                        />
                    )}
                </>
            )}
        </div>
    )
}
