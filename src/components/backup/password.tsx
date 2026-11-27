import {
    BackupConfigView,
    BackupKeyResponse,
    changeBackupPassword,
    resetBackupPassword,
    setBackupPassword,
} from "@/api/backup"
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
import { useAuth } from "@/hooks/useAuth"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

/**
 * Length in characters (code points), as the dashboard counts it. String.length
 * counts UTF-16 units, so emoji counted twice and a too short password passed
 * this check only to be rejected by the server.
 */
function characterCount(s: string): number {
    return Array.from(s).length
}

/** Returns an i18n key describing the first problem, or null. */
export function passwordProblem(pw: string, confirm: string, minLength: number): string | null {
    if (characterCount(pw) < minLength) return "Backup.Password.TooShort"
    if (pw !== confirm) return "Backup.Password.Mismatch"
    return null
}

/**
 * Accounts with a login password confirm with it; OAuth-only accounts (no
 * usable password) need a recent sign-in instead, which the server checks.
 */
function useLoginPasswordRequired(): boolean {
    const { profile } = useAuth()
    return !profile?.reject_password
}

function LoginPasswordField({
    idPrefix,
    value,
    onChange,
}: {
    idPrefix: string
    value: string
    onChange: (v: string) => void
}) {
    const { t } = useTranslation()
    return (
        <div className="grid gap-2">
            <Label htmlFor={`${idPrefix}-login-password`}>
                {t("Backup.Password.LoginPassword")}
            </Label>
            <Input
                id={`${idPrefix}-login-password`}
                type="password"
                autoComplete="current-password"
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
            <span className="text-muted-foreground text-xs">
                {t("Backup.Password.LoginPasswordHint")}
            </span>
        </div>
    )
}

function NewPasswordFields({
    idPrefix,
    minLength,
    password,
    confirm,
    onPassword,
    onConfirm,
}: {
    idPrefix: string
    minLength: number
    password: string
    confirm: string
    onPassword: (v: string) => void
    onConfirm: (v: string) => void
}) {
    const { t } = useTranslation()
    return (
        <>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-new`}>{t("Backup.Password.New")}</Label>
                <Input
                    id={`${idPrefix}-new`}
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => onPassword(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">
                    {t("Backup.Password.LengthHint", {
                        min: minLength,
                        length: characterCount(password),
                    })}
                </span>
            </div>
            <div className="grid gap-2">
                <Label htmlFor={`${idPrefix}-confirm`}>{t("Backup.Password.Confirm")}</Label>
                <Input
                    id={`${idPrefix}-confirm`}
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => onConfirm(e.target.value)}
                />
            </div>
        </>
    )
}

/**
 * First-time setup: password twice. The recovery key is handed to the page,
 * which shows it: this form unmounts as soon as the configuration counts as
 * complete (e.g. on a revalidation when the window regains focus), and a
 * dialog kept here disappeared with it before the key was saved.
 */
export function SetBackupPasswordForm({
    config,
    onKeyCreated,
}: {
    config: BackupConfigView
    onKeyCreated: (key: BackupKeyResponse) => void
}) {
    const { t } = useTranslation()
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [loginPassword, setLoginPassword] = useState("")
    const [busy, setBusy] = useState(false)
    const loginRequired = useLoginPasswordRequired()
    const min = config.password_min_length || 12

    async function submit() {
        const problem = passwordProblem(password, confirm, min)
        if (problem) {
            toast.error(t("Error"), { description: t(problem, { min }) })
            return
        }
        if (loginRequired && !loginPassword) {
            toast.error(t("Error"), { description: t("Backup.Password.LoginPasswordRequired") })
            return
        }
        setBusy(true)
        try {
            const res = await setBackupPassword(password, loginRequired ? loginPassword : undefined)
            setPassword("")
            setConfirm("")
            setLoginPassword("")
            onKeyCreated(res)
        } catch (e) {
            toast.error(t("Error"), { description: (e as Error).message })
        } finally {
            setBusy(false)
        }
    }

    return (
        <form
            className="grid max-w-md gap-4"
            onSubmit={(e) => {
                e.preventDefault()
                void submit()
            }}
        >
            <p className="text-muted-foreground text-sm">{t("Backup.Password.SetupHint")}</p>
            <NewPasswordFields
                idPrefix="backup-setup"
                minLength={min}
                password={password}
                confirm={confirm}
                onPassword={setPassword}
                onConfirm={setConfirm}
            />
            {loginRequired && (
                <LoginPasswordField
                    idPrefix="backup-setup"
                    value={loginPassword}
                    onChange={setLoginPassword}
                />
            )}
            <div>
                <Button type="submit" disabled={busy}>
                    {busy ? t("Loading") + "..." : t("Backup.Password.Set")}
                </Button>
            </div>
        </form>
    )
}

/**
 * Shows the recovery key exactly once. It cannot be dismissed (Esc, outside
 * click, no close button) until the user confirms it has been stored; the key
 * lives only in the parent's state and is dropped on close.
 */
export function RecoveryKeyDialog({
    keyResponse,
    onClose,
}: {
    keyResponse: BackupKeyResponse | null
    onClose: () => void
}) {
    const { t } = useTranslation()
    const [saved, setSaved] = useState(false)
    const key = keyResponse?.recovery_key ?? ""

    const download = () => {
        // Built locally; the key never goes back to the server.
        const blob = new Blob(
            [
                `Nezha backup recovery key\nKey ID: ${keyResponse?.key_id ?? ""}\nCreated: ${keyResponse?.created_at ?? ""}\n\n${key}\n`,
            ],
            { type: "text/plain" },
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `nezha-backup-recovery-key-${keyResponse?.key_id ?? "key"}.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <AlertDialog open={!!keyResponse}>
            <AlertDialogContent onEscapeKeyDown={(e) => e.preventDefault()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("Backup.RecoveryKey.Title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {t("Backup.RecoveryKey.Description")}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-3">
                    <div className="rounded border border-amber-500/40 bg-amber-100 p-3 text-sm dark:bg-amber-950/40">
                        {t("Backup.RecoveryKey.Warning")}
                    </div>
                    <code
                        data-testid="backup-recovery-key"
                        className="bg-muted block break-all rounded p-3 font-mono text-xs"
                    >
                        {key}
                    </code>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={async () => {
                                await navigator.clipboard.writeText(key)
                                toast(t("Copied"))
                            }}
                        >
                            {t("Copy")}
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={download}>
                            {t("Backup.RecoveryKey.Download")}
                        </Button>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                        <Checkbox
                            checked={saved}
                            onCheckedChange={(v) => setSaved(v === true)}
                            aria-label={t("Backup.RecoveryKey.Saved")}
                        />
                        {t("Backup.RecoveryKey.Saved")}
                    </label>
                </div>
                <AlertDialogFooter>
                    <Button
                        type="button"
                        disabled={!saved}
                        onClick={() => {
                            setSaved(false)
                            onClose()
                        }}
                    >
                        {t("Done")}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function ChangeBackupPasswordDialog({
    open,
    onOpenChange,
    minLength,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    minLength: number
}) {
    const { t } = useTranslation()
    const [oldPassword, setOldPassword] = useState("")
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [busy, setBusy] = useState(false)

    const reset = () => {
        setOldPassword("")
        setPassword("")
        setConfirm("")
    }

    async function submit() {
        if (!oldPassword) {
            toast.error(t("Error"), { description: t("Backup.Password.OldRequired") })
            return
        }
        const problem = passwordProblem(password, confirm, minLength)
        if (problem) {
            toast.error(t("Error"), { description: t(problem, { min: minLength }) })
            return
        }
        setBusy(true)
        try {
            await changeBackupPassword(oldPassword, password)
            toast.success(t("Backup.Password.Changed"), {
                description: t("Backup.Password.ChangedHint"),
            })
            reset()
            onOpenChange(false)
        } catch (e) {
            toast.error(t("Error"), { description: (e as Error).message })
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) reset()
                onOpenChange(v)
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("Backup.Password.Change")}</DialogTitle>
                    <DialogDescription>{t("Backup.Password.ChangeDescription")}</DialogDescription>
                </DialogHeader>
                <form
                    id="backup-change-password"
                    className="grid gap-4"
                    onSubmit={(e) => {
                        e.preventDefault()
                        void submit()
                    }}
                >
                    <div className="grid gap-2">
                        <Label htmlFor="backup-change-old">{t("Backup.Password.Old")}</Label>
                        <Input
                            id="backup-change-old"
                            type="password"
                            autoComplete="current-password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    <NewPasswordFields
                        idPrefix="backup-change"
                        minLength={minLength}
                        password={password}
                        confirm={confirm}
                        onPassword={setPassword}
                        onConfirm={setConfirm}
                    />
                </form>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">{t("Cancel")}</Button>
                    </DialogClose>
                    <Button type="submit" form="backup-change-password" disabled={busy}>
                        {busy ? t("Loading") + "..." : t("Confirm")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function ResetBackupPasswordDialog({
    open,
    onOpenChange,
    minLength,
    confirmWord,
    affectedBackups,
    onReset,
}: {
    open: boolean
    onOpenChange: (v: boolean) => void
    minLength: number
    confirmWord: string
    affectedBackups: number
    onReset: (res: BackupKeyResponse) => void
}) {
    const { t } = useTranslation()
    const [password, setPassword] = useState("")
    const [confirm, setConfirm] = useState("")
    const [typed, setTyped] = useState("")
    const [loginPassword, setLoginPassword] = useState("")
    const [busy, setBusy] = useState(false)
    const loginRequired = useLoginPasswordRequired()

    const reset = () => {
        setPassword("")
        setConfirm("")
        setTyped("")
        setLoginPassword("")
    }

    async function submit() {
        const problem = passwordProblem(password, confirm, minLength)
        if (problem) {
            toast.error(t("Error"), { description: t(problem, { min: minLength }) })
            return
        }
        if (loginRequired && !loginPassword) {
            toast.error(t("Error"), { description: t("Backup.Password.LoginPasswordRequired") })
            return
        }
        setBusy(true)
        try {
            const res = await resetBackupPassword(
                password,
                typed,
                loginRequired ? loginPassword : undefined,
            )
            reset()
            onOpenChange(false)
            onReset(res)
        } catch (e) {
            toast.error(t("Error"), { description: (e as Error).message })
        } finally {
            setBusy(false)
        }
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!v) reset()
                onOpenChange(v)
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("Backup.Password.Reset")}</DialogTitle>
                </DialogHeader>
                <div
                    role="alert"
                    className="border-destructive bg-destructive/10 text-destructive rounded border p-3 text-sm"
                >
                    <p className="font-semibold">{t("Backup.Password.ResetWarningTitle")}</p>
                    <p className="mt-1">{t("Backup.Password.ResetWarning")}</p>
                    <p className="mt-1">
                        {t("Backup.Password.ResetAffected", { count: affectedBackups })}
                    </p>
                </div>
                <form
                    id="backup-reset-password"
                    className="grid gap-4"
                    onSubmit={(e) => {
                        e.preventDefault()
                        void submit()
                    }}
                >
                    <NewPasswordFields
                        idPrefix="backup-reset"
                        minLength={minLength}
                        password={password}
                        confirm={confirm}
                        onPassword={setPassword}
                        onConfirm={setConfirm}
                    />
                    <div className="grid gap-2">
                        <Label htmlFor="backup-reset-word">
                            {t("Backup.Password.ResetTypeWord", { word: confirmWord })}
                        </Label>
                        <Input
                            id="backup-reset-word"
                            autoComplete="off"
                            value={typed}
                            onChange={(e) => setTyped(e.target.value)}
                        />
                    </div>
                    {loginRequired && (
                        <LoginPasswordField
                            idPrefix="backup-reset"
                            value={loginPassword}
                            onChange={setLoginPassword}
                        />
                    )}
                </form>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">{t("Cancel")}</Button>
                    </DialogClose>
                    <Button
                        type="submit"
                        form="backup-reset-password"
                        variant="destructive"
                        disabled={busy || typed !== confirmWord}
                    >
                        {busy ? t("Loading") + "..." : t("Backup.Password.ResetSubmit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
