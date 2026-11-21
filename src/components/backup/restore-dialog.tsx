import {
    BackupCredential,
    BackupInfo,
    RestorePrepareResponse,
    applyRestore,
    cancelRestore,
    formatBytes,
    prepareRestore,
    prepareRestoreUpload,
    restoreConfirmWord,
} from "@/api/backup"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { CheckCircle2, XCircle } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

export type RestoreSource = { kind: "storage"; backup: BackupInfo } | { kind: "upload" }

type CredentialKind = "password" | "recovery_key"

export function toCredential(kind: CredentialKind, value: string): BackupCredential {
    return kind === "password" ? { password: value } : { recovery_key: value.trim() }
}

/** The server voids a token on expiry, reuse or repeated failures. */
export function isRestoreTokenError(message: string): boolean {
    return /restore token/i.test(message)
}

function CredentialInput({
    idPrefix,
    kind,
    value,
    onKind,
    onValue,
}: {
    idPrefix: string
    kind: CredentialKind
    value: string
    onKind: (k: CredentialKind) => void
    onValue: (v: string) => void
}) {
    const { t } = useTranslation()
    return (
        <div className="grid gap-2">
            <div className="flex gap-4 text-sm" role="radiogroup">
                {(["password", "recovery_key"] as const).map((k) => (
                    <label key={k} className="flex items-center gap-1.5">
                        <input
                            type="radio"
                            name={`${idPrefix}-kind`}
                            checked={kind === k}
                            onChange={() => {
                                onKind(k)
                                onValue("")
                            }}
                        />
                        {k === "password"
                            ? t("Backup.Restore.UsePassword")
                            : t("Backup.Restore.UseRecoveryKey")}
                    </label>
                ))}
            </div>
            <Label htmlFor={`${idPrefix}-credential`}>
                {kind === "password"
                    ? t("Backup.Restore.BackupPassword")
                    : t("Backup.Restore.RecoveryKey")}
            </Label>
            <Input
                id={`${idPrefix}-credential`}
                type="password"
                autoComplete="off"
                className={kind === "recovery_key" ? "font-mono" : ""}
                value={value}
                onChange={(e) => onValue(e.target.value)}
            />
        </div>
    )
}

function useCountdown(expiresAt: string | undefined): number | null {
    const [now, setNow] = useState(() => Date.now())
    useEffect(() => {
        if (!expiresAt) return
        const id = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(id)
    }, [expiresAt])
    if (!expiresAt) return null
    const end = Date.parse(expiresAt)
    if (!Number.isFinite(end)) return null
    return Math.max(0, Math.floor((end - now) / 1000))
}

export function RestoreDialog({
    source,
    uploadMaxBytes,
    onClose,
    onApplied,
}: {
    source: RestoreSource | null
    uploadMaxBytes: number
    onClose: () => void
    onApplied: () => void
}) {
    const { t } = useTranslation()
    const { logout } = useAuth()
    const [step, setStep] = useState<"prepare" | "apply">("prepare")
    const [busy, setBusy] = useState(false)
    const [progress, setProgress] = useState<number | null>(null)

    const [file, setFile] = useState<File | null>(null)
    const [credKind, setCredKind] = useState<CredentialKind>("password")
    const [cred, setCred] = useState("")

    const [result, setResult] = useState<RestorePrepareResponse | null>(null)
    const [acked, setAcked] = useState<Set<string>>(new Set())

    const [applyKind, setApplyKind] = useState<CredentialKind>("password")
    const [applyCred, setApplyCred] = useState("")
    const [confirm, setConfirm] = useState("")
    const [loginPassword, setLoginPassword] = useState("")

    // Kept in a ref too so the unmount/close path can release the staged
    // restore without depending on render timing.
    const tokenRef = useRef<string | null>(null)
    const token = result?.restore_token
    tokenRef.current = token ?? null
    const remaining = useCountdown(token ? result?.expires_at : undefined)
    const expired = remaining === 0

    function resetAll() {
        setStep("prepare")
        setBusy(false)
        setProgress(null)
        setFile(null)
        setCredKind("password")
        setCred("")
        setResult(null)
        setAcked(new Set())
        setApplyKind("password")
        setApplyCred("")
        setConfirm("")
        setLoginPassword("")
    }

    function releaseToken() {
        const tk = tokenRef.current
        tokenRef.current = null
        if (tk) void cancelRestore(tk).catch(() => undefined)
    }

    // Each check gets a generation number. Anything that changes what is
    // being checked (another file, another source, closing) bumps it, so a
    // response that arrives late is never shown and its staged restore is
    // released instead of being applied by mistake.
    const generation = useRef(0)
    function invalidatePending() {
        generation.current++
        setBusy(false)
        setProgress(null)
    }

    // A new source starts a fresh dialog.
    useEffect(() => {
        invalidatePending()
        releaseToken()
        resetAll()
    }, [source])

    useEffect(
        () => () => {
            generation.current++
            releaseToken()
        },
        [],
    )

    function close() {
        invalidatePending()
        releaseToken()
        resetAll()
        onClose()
    }

    function backToPrepare() {
        releaseToken()
        setResult(null)
        setAcked(new Set())
        setStep("prepare")
        setApplyCred("")
        setConfirm("")
        setLoginPassword("")
    }

    async function runPrepare() {
        if (!source) return
        if (!cred) {
            toast.error(t("Error"), { description: t("Backup.Restore.CredentialRequired") })
            return
        }
        if (source.kind === "upload") {
            if (!file) {
                toast.error(t("Error"), { description: t("Backup.Restore.FileRequired") })
                return
            }
            if (uploadMaxBytes > 0 && file.size > uploadMaxBytes) {
                toast.error(t("Error"), {
                    description: t("Backup.Restore.FileTooLarge", {
                        max: formatBytes(uploadMaxBytes),
                    }),
                })
                return
            }
        }
        releaseToken()
        const gen = ++generation.current
        const current = () => gen === generation.current
        setBusy(true)
        setResult(null)
        try {
            const credential = toCredential(credKind, cred)
            const res =
                source.kind === "storage"
                    ? await prepareRestore(source.backup.name, source.backup.sha256, credential)
                    : await prepareRestoreUpload(file as File, credential, (loaded, total) => {
                          if (current())
                              setProgress(total > 0 ? Math.round((loaded / total) * 100) : null)
                      })
            if (!current()) {
                // Stale: the user switched files or closed the dialog meanwhile.
                if (res?.restore_token) void cancelRestore(res.restore_token).catch(() => undefined)
                return
            }
            setResult(res)
            setAcked(new Set())
            setApplyKind(credKind)
        } catch (e) {
            if (current())
                toast.error(t("Backup.Restore.CheckFailed"), {
                    description: (e as Error).message,
                })
        } finally {
            if (current()) {
                setBusy(false)
                setProgress(null)
            }
        }
    }

    const requiredAcks = (result?.warnings ?? []).filter((w) => w.require_ack).map((w) => w.code)
    const allAcked = requiredAcks.every((c) => acked.has(c))
    const canContinue = !!result?.can_apply && !!token && !expired && allAcked
    const confirmWord = restoreConfirmWord(result?.name, result?.confirm_word_length ?? 6)
    // The server takes a pre-restore backup only when storage and a key are
    // set up; otherwise it says so with this warning.
    const preRestoreSkipped = (result?.warnings ?? []).some((w) => w.code === "pre_restore_skipped")
    const requires = result?.apply_requires ?? { login_password: false, reauth_needed: false }
    const canApply =
        canContinue &&
        !!applyCred &&
        confirm === confirmWord &&
        !requires.reauth_needed &&
        (!requires.login_password || !!loginPassword)

    async function runApply() {
        if (!token || !canApply) return
        setBusy(true)
        try {
            const credential = toCredential(applyKind, applyCred)
            await applyRestore({
                restore_token: token,
                confirm,
                acknowledged: requiredAcks,
                ...(requires.login_password ? { login_password: loginPassword } : {}),
                ...credential,
            })
            // The token is consumed; nothing to cancel any more.
            tokenRef.current = null
            resetAll()
            onApplied()
        } catch (e) {
            const msg = (e as Error).message
            toast.error(t("Error"), { description: msg })
            if (isRestoreTokenError(msg)) backToPrepare()
        } finally {
            setBusy(false)
        }
    }

    const title =
        source?.kind === "upload"
            ? t("Backup.Restore.TitleUpload")
            : t("Backup.Restore.Title", {
                  name: source?.kind === "storage" ? source.backup.name : "",
              })

    return (
        <Dialog open={!!source} onOpenChange={(v) => !v && close()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {step === "prepare"
                            ? t("Backup.Restore.Step1Description")
                            : t("Backup.Restore.Step2Description")}
                    </DialogDescription>
                </DialogHeader>

                {step === "prepare" && (
                    <div className="grid gap-4">
                        {source?.kind === "upload" && (
                            <div className="grid gap-2">
                                <Label htmlFor="backup-restore-file">
                                    {t("Backup.Restore.File")}
                                </Label>
                                <Input
                                    id="backup-restore-file"
                                    type="file"
                                    accept=".nzbak"
                                    onChange={(e) => {
                                        invalidatePending()
                                        releaseToken()
                                        setFile(e.target.files?.[0] ?? null)
                                        setResult(null)
                                        setAcked(new Set())
                                    }}
                                />
                                <span className="text-muted-foreground text-xs">
                                    {t("Backup.Restore.FileHint", {
                                        max: formatBytes(uploadMaxBytes),
                                    })}
                                </span>
                            </div>
                        )}
                        {source?.kind === "storage" && (
                            <p className="text-muted-foreground text-xs">
                                SHA-256: <span className="font-mono">{source.backup.sha256}</span>
                            </p>
                        )}
                        <CredentialInput
                            idPrefix="backup-restore-check"
                            kind={credKind}
                            value={cred}
                            onKind={setCredKind}
                            onValue={setCred}
                        />
                        <div>
                            <Button type="button" onClick={runPrepare} disabled={busy}>
                                {busy
                                    ? progress !== null
                                        ? t("Backup.Restore.Uploading", { percent: progress })
                                        : t("Backup.Restore.Checking")
                                    : t("Backup.Restore.Check")}
                            </Button>
                        </div>

                        {result && (
                            <PrepareResult
                                result={result}
                                acked={acked}
                                onAck={(code, v) =>
                                    setAcked((cur) => {
                                        const next = new Set(cur)
                                        if (v) next.add(code)
                                        else next.delete(code)
                                        return next
                                    })
                                }
                                remaining={remaining}
                            />
                        )}
                    </div>
                )}

                {step === "apply" && result && (
                    <form
                        id="backup-restore-apply"
                        className="grid gap-4"
                        onSubmit={(e) => {
                            e.preventDefault()
                            void runApply()
                        }}
                    >
                        <div
                            role="alert"
                            className="border-destructive bg-destructive/10 text-destructive rounded border p-3 text-sm"
                        >
                            <p>{t("Backup.Restore.ApplyWarning")}</p>
                            <p className="mt-1 font-medium" data-testid="restore-pre-backup">
                                {preRestoreSkipped
                                    ? t("Backup.Restore.NoPreRestoreBackup")
                                    : t("Backup.Restore.PreRestoreBackup")}
                            </p>
                        </div>
                        {remaining !== null && (
                            <p
                                className="text-muted-foreground text-xs"
                                data-testid="restore-countdown"
                            >
                                {expired
                                    ? t("Backup.Restore.Expired")
                                    : t("Backup.Restore.ExpiresIn", {
                                          time: formatCountdown(remaining),
                                      })}
                            </p>
                        )}
                        <CredentialInput
                            idPrefix="backup-restore-apply"
                            kind={applyKind}
                            value={applyCred}
                            onKind={setApplyKind}
                            onValue={setApplyCred}
                        />
                        <div className="grid gap-2">
                            <Label htmlFor="backup-restore-confirm">
                                {t("Backup.Restore.ConfirmLabel", { length: confirmWord.length })}
                            </Label>
                            <p className="font-mono text-sm break-all">
                                {(result.name ?? "").slice(0, -confirmWord.length || undefined)}
                                <mark className="bg-amber-200 dark:bg-amber-800 rounded px-0.5">
                                    {confirmWord}
                                </mark>
                            </p>
                            <Input
                                id="backup-restore-confirm"
                                autoComplete="off"
                                className="font-mono"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                            />
                        </div>
                        {requires.login_password && (
                            <div className="grid gap-2">
                                <Label htmlFor="backup-restore-login-password">
                                    {t("Backup.Restore.LoginPassword")}
                                </Label>
                                <Input
                                    id="backup-restore-login-password"
                                    type="password"
                                    autoComplete="current-password"
                                    value={loginPassword}
                                    onChange={(e) => setLoginPassword(e.target.value)}
                                />
                            </div>
                        )}
                        {requires.reauth_needed && (
                            <div className="rounded border border-amber-500/40 bg-amber-100 p-3 text-sm dark:bg-amber-950/40">
                                <p>{t("Backup.Restore.ReauthNeeded")}</p>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="mt-2"
                                    onClick={() => {
                                        close()
                                        logout()
                                    }}
                                >
                                    {t("Backup.Restore.SignInAgain")}
                                </Button>
                            </div>
                        )}
                    </form>
                )}

                <DialogFooter className="gap-2">
                    <Button type="button" variant="outline" onClick={close}>
                        {t("Cancel")}
                    </Button>
                    {step === "prepare" ? (
                        <Button
                            type="button"
                            disabled={!canContinue}
                            onClick={() => setStep("apply")}
                        >
                            {t("Backup.Restore.Next")}
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep("prepare")}
                            >
                                {t("Backup.Restore.Back")}
                            </Button>
                            <Button
                                type="submit"
                                form="backup-restore-apply"
                                variant="destructive"
                                disabled={busy || !canApply}
                            >
                                {busy ? t("Loading") + "..." : t("Backup.Restore.Apply")}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${String(s).padStart(2, "0")}`
}

function PrepareResult({
    result,
    acked,
    onAck,
    remaining,
}: {
    result: RestorePrepareResponse
    acked: Set<string>
    onAck: (code: string, v: boolean) => void
    remaining: number | null
}) {
    const { t } = useTranslation()
    const m = result.manifest
    const tables = Object.entries(m?.tables ?? {}).sort(([a], [b]) => a.localeCompare(b))
    return (
        <div className="grid gap-3 rounded border p-3 text-sm" data-testid="restore-check-result">
            {m && (
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                    <dt className="text-muted-foreground">{t("Name")}</dt>
                    <dd className="font-mono break-all">{result.name}</dd>
                    <dt className="text-muted-foreground">{t("CreatedAt")}</dt>
                    <dd>{m.created_at ? new Date(m.created_at).toLocaleString() : "-"}</dd>
                    <dt className="text-muted-foreground">{t("Backup.List.Version")}</dt>
                    <dd>{m.nezha_version || "-"}</dd>
                    <dt className="text-muted-foreground">{t("Backup.Restore.HasConfig")}</dt>
                    <dd>{m.has_config ? t("Backup.Yes") : t("Backup.No")}</dd>
                </dl>
            )}
            {tables.length > 0 && (
                <details>
                    <summary className="cursor-pointer">{t("Backup.Restore.Tables")}</summary>
                    <ul className="mt-1 grid grid-cols-2 gap-x-4 font-mono text-xs sm:grid-cols-3">
                        {tables.map(([name, rows]) => (
                            <li key={name}>
                                {name}: {rows}
                            </li>
                        ))}
                    </ul>
                </details>
            )}
            <ul className="grid gap-1">
                {result.checks.map((c) => (
                    <li key={c.code} className="flex items-start gap-2">
                        {c.ok ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                        ) : (
                            <XCircle className="text-destructive mt-0.5 h-4 w-4 shrink-0" />
                        )}
                        <span>
                            {t(`Backup.Check.${c.code}`, { defaultValue: c.code })}
                            {!c.ok && c.message && (
                                <span className="text-destructive block text-xs">{c.message}</span>
                            )}
                        </span>
                    </li>
                ))}
            </ul>
            {result.warnings.length > 0 && (
                <ul className="grid gap-2">
                    {result.warnings.map((w) => (
                        <li
                            key={w.code}
                            className={
                                w.require_ack
                                    ? "rounded border border-destructive bg-destructive/10 p-2"
                                    : "rounded border border-amber-500/40 bg-amber-100 p-2 dark:bg-amber-950/40"
                            }
                        >
                            <p>
                                {t(`Backup.Warning.${w.code}`, {
                                    defaultValue: w.message || w.code,
                                })}
                            </p>
                            {w.require_ack && (
                                <label className="mt-1 flex items-center gap-2 font-medium">
                                    <Checkbox
                                        checked={acked.has(w.code)}
                                        onCheckedChange={(v) => onAck(w.code, v === true)}
                                        aria-label={t("Backup.Restore.Acknowledge")}
                                    />
                                    {t("Backup.Restore.Acknowledge")}
                                </label>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            {!result.can_apply && (
                <p className="text-destructive font-medium" role="alert">
                    {t("Backup.Restore.CannotApply")}
                </p>
            )}
            {result.can_apply && remaining !== null && (
                <p className="text-muted-foreground text-xs">
                    {remaining === 0
                        ? t("Backup.Restore.Expired")
                        : t("Backup.Restore.ExpiresIn", { time: formatCountdown(remaining) })}
                </p>
            )}
        </div>
    )
}
