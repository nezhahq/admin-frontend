import {
    ApiTokenCreateResponse,
    ApiTokenView,
    SCOPE_OPTIONS,
    createApiToken,
    deleteApiToken,
    listApiTokens,
    parseExpiresInDaysInput,
    parseServerIDsInput,
} from "@/api/api-tokens"
import { SettingsTab } from "@/components/settings-tab"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/hooks/useAuth"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import useSWR from "swr"

export default function ApiTokensPage() {
    const { t } = useTranslation()
    const { profile } = useAuth()
    const isAdmin = profile?.role === 0

    const { data, mutate, isLoading, error } = useSWR<ApiTokenView[]>(
        "/api/v1/api-tokens",
        listApiTokens,
    )

    useEffect(() => {
        if (!error) return
        toast(t("Error"), {
            description: t("Results.ErrorFetchingResource", {
                error: (error as Error)?.message ?? String(error),
            }),
        })
    }, [error, t])

    const [createOpen, setCreateOpen] = useState(false)
    const [revealed, setRevealed] = useState<ApiTokenCreateResponse | null>(null)

    const handleDelete = async (id: number, name: string) => {
        if (!window.confirm(t("ConfirmDeleteApiToken", { name }))) return
        try {
            await deleteApiToken(id)
            toast(t("ApiTokenRevoked"))
            await mutate()
        } catch (e: any) {
            toast(t("Error"), { description: e.message })
        }
    }

    return (
        <div className="px-3">
            <SettingsTab className="mt-6 w-full" />

            <div className="flex mt-4 mb-4 items-center justify-between">
                <h2 className="text-lg font-semibold">{t("ApiTokens")}</h2>
                <Button onClick={() => setCreateOpen(true)}>{t("CreateApiToken")}</Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("Name")}</TableHead>
                        <TableHead>{t("Scopes")}</TableHead>
                        <TableHead>{t("ApiTokenServers")}</TableHead>
                        <TableHead>{t("ApiTokenExpiresAt")}</TableHead>
                        <TableHead>{t("ApiTokenLastUsed")}</TableHead>
                        <TableHead>{t("Actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                {t("Loading")}...
                            </TableCell>
                        </TableRow>
                    ) : !data || data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                {t("NoResults")}
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((tok) => (
                            <TableRow key={tok.id}>
                                <TableCell>{tok.name}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {(tok.scopes ?? []).map((s) => (
                                            <span
                                                key={s}
                                                className="rounded bg-secondary px-1.5 py-0.5 text-xs"
                                            >
                                                {s}
                                            </span>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                    {tok.server_ids?.length ? tok.server_ids.join(", ") : t("ApiTokenAllServers")}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {tok.expires_at ? new Date(tok.expires_at).toLocaleString() : t("ApiTokenNever")}
                                </TableCell>
                                <TableCell className="text-xs">
                                    {tok.last_used_at
                                        ? `${new Date(tok.last_used_at).toLocaleString()} (${tok.last_used_ip ?? "?"})`
                                        : t("ApiTokenNever")}
                                </TableCell>
                                <TableCell>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(tok.id, tok.name)}
                                    >
                                        {t("Revoke")}
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            <CreateApiTokenDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                isAdmin={isAdmin}
                onCreated={(res) => {
                    setRevealed(res)
                    mutate()
                }}
            />

            <RevealedTokenDialog token={revealed} onClose={() => setRevealed(null)} />
        </div>
    )
}

function CreateApiTokenDialog({
    open,
    onOpenChange,
    isAdmin,
    onCreated,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    isAdmin: boolean
    onCreated: (res: ApiTokenCreateResponse) => void
}) {
    const { t } = useTranslation()
    const [name, setName] = useState("")
    const [scopes, setScopes] = useState<string[]>([])
    const [serverIDs, setServerIDs] = useState("")
    const [expiresInDays, setExpiresInDays] = useState<string>("90")
    const [submitting, setSubmitting] = useState(false)

    const toggleScope = (s: string) => {
        setScopes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))
    }

    const submit = async () => {
        if (!name.trim()) {
            toast(t("Error"), { description: t("NameRequired") })
            return
        }
        if (scopes.length === 0) {
            toast(t("Error"), { description: t("ApiTokenScopeRequired") })
            return
        }
        const parsedRes = parseServerIDsInput(serverIDs)
        if (!parsedRes.ok) {
            toast(t("Error"), { description: t("ApiTokenServersInvalid") })
            return
        }
        const parsedServers = parsedRes.value
        const expRes = parseExpiresInDaysInput(expiresInDays)
        if (!expRes.ok) {
            toast(t("Error"), { description: t("ApiTokenExpiryInvalid") })
            return
        }
        const expDays = expRes.value
        setSubmitting(true)
        try {
            const res = await createApiToken({
                name: name.trim(),
                scopes,
                server_ids: parsedServers,
                expires_in_days: expDays,
            })
            onCreated(res)
            onOpenChange(false)
            setName("")
            setScopes([])
            setServerIDs("")
            setExpiresInDays("90")
        } catch (e: any) {
            toast(t("Error"), { description: e.message })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("CreateApiToken")}</DialogTitle>
                    <DialogDescription>{t("CreateApiTokenDescription")}</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="name">{t("Name")}</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                        <Label>{t("Scopes")}</Label>
                        <div className="max-h-72 space-y-2 overflow-y-auto pr-2">
                            {SCOPE_OPTIONS.map((s) => {
                                const adminOnly = s.value === "nezha:*" || s.value === "nezha:admin:*"
                                const disabled = adminOnly && !isAdmin
                                return (
                                    <label
                                        key={s.value}
                                        className={`flex items-start gap-2 text-sm ${disabled ? "opacity-40" : ""}`}
                                    >
                                        <Checkbox
                                            checked={scopes.includes(s.value)}
                                            onCheckedChange={() => !disabled && toggleScope(s.value)}
                                            disabled={disabled}
                                        />
                                        <div className="flex flex-col">
                                            <span className="font-mono text-xs">{s.value}</span>
                                            <span className="text-xs text-muted-foreground">{s.desc}</span>
                                        </div>
                                    </label>
                                )
                            })}
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="server-ids">{t("ApiTokenServerIDs")}</Label>
                        <Input
                            id="server-ids"
                            placeholder={t("ApiTokenServerIDsPlaceholder")}
                            value={serverIDs}
                            onChange={(e) => setServerIDs(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="expires">{t("ApiTokenExpiresInDays")}</Label>
                        <Input
                            id="expires"
                            type="number"
                            min={0}
                            max={3650}
                            value={expiresInDays}
                            onChange={(e) => setExpiresInDays(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">{t("Cancel")}</Button>
                    </DialogClose>
                    <Button onClick={submit} disabled={submitting}>
                        {submitting ? t("Loading") + "..." : t("CreateApiToken")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function RevealedTokenDialog({
    token,
    onClose,
}: {
    token: ApiTokenCreateResponse | null
    onClose: () => void
}) {
    const { t } = useTranslation()
    return (
        <Dialog open={!!token} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("ApiTokenCreated")}</DialogTitle>
                    <DialogDescription>{t("ApiTokenRevealOnce")}</DialogDescription>
                </DialogHeader>
                {token && (
                    <div className="space-y-3">
                        <div className="rounded border border-amber-500/40 bg-amber-100 dark:bg-amber-950/40 p-3 text-sm">
                            {t("ApiTokenStoreSafely")}
                        </div>
                        <code className="block break-all rounded bg-muted p-3 font-mono text-xs">
                            {token.token}
                        </code>
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                                await navigator.clipboard.writeText(token.token)
                                toast(t("Copied"))
                            }}
                        >
                            {t("Copy")}
                        </Button>
                    </div>
                )}
                <DialogFooter>
                    <Button onClick={onClose}>{t("Done")}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
