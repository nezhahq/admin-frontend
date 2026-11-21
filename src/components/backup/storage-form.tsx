import {
    BackupConfigView,
    BackupS3Update,
    secretRequired,
    testBackupStorage,
    updateBackupConfig,
    validateS3Endpoint,
    validateS3Prefix,
} from "@/api/backup"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

interface FormState {
    endpoint: string
    bucket: string
    region: string
    prefix: string
    use_path_style: boolean
    access_key_id: string
    secret_access_key: string
}

function initialState(config: BackupConfigView): FormState {
    const s3 = config.s3
    return {
        endpoint: s3.endpoint ?? "",
        bucket: s3.bucket ?? "",
        region: s3.region || "auto",
        prefix: s3.prefix || "nezha-backup/",
        use_path_style: s3.use_path_style ?? true,
        // The saved key id is only shown masked; typing replaces it.
        access_key_id: "",
        secret_access_key: "",
    }
}

export function BackupStorageForm({
    config,
    onSaved,
    requireTest = false,
}: {
    config: BackupConfigView
    onSaved: (next: BackupConfigView) => void
    /** First-time setup: saving needs a passing connection test of the exact values. */
    requireTest?: boolean
}) {
    const { t } = useTranslation()
    const [form, setForm] = useState<FormState>(() => initialState(config))
    const [busy, setBusy] = useState<"save" | "test" | null>(null)
    const [testedValues, setTestedValues] = useState<string | null>(null)
    const fingerprint = JSON.stringify(form)
    const saveBlocked = requireTest && testedValues !== fingerprint

    // Re-seed when the saved configuration changes (after save or refetch).
    useEffect(() => {
        setForm(initialState(config))
    }, [config])

    const locked = useMemo(() => new Set(config.s3.env_locked ?? []), [config.s3.env_locked])
    // A secret supplied by the environment cannot travel with a moved target,
    // so the target is pinned as well.
    const secretLocked = locked.has("secret_access_key")
    const isLocked = (f: string) =>
        locked.has(f) || (secretLocked && (f === "endpoint" || f === "bucket"))

    const needSecret =
        !secretLocked && secretRequired(config.s3, { endpoint: form.endpoint, bucket: form.bucket })
    const keyIdRequired = !locked.has("access_key_id") && !config.s3.access_key_id_masked

    const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
        setForm((cur) => ({ ...cur, [k]: v }))

    function validate(): string | null {
        if (!isLocked("endpoint") && !validateS3Endpoint(form.endpoint))
            return t("Backup.Storage.EndpointInvalid")
        if (!isLocked("bucket") && !form.bucket.trim()) return t("Backup.Storage.BucketRequired")
        if (!isLocked("prefix") && !validateS3Prefix(form.prefix))
            return t("Backup.Storage.PrefixInvalid")
        if (keyIdRequired && !form.access_key_id.trim()) return t("Backup.Storage.KeyIdRequired")
        if (needSecret && !form.secret_access_key) return t("Backup.Storage.SecretRequired")
        return null
    }

    // Only fields the user may change and actually changed are sent; an empty
    // secret or key id means "keep the saved value".
    function payload(): BackupS3Update {
        const s3 = config.s3
        const out: BackupS3Update = {}
        const str = (k: "endpoint" | "bucket" | "region" | "prefix") => {
            if (isLocked(k)) return
            const v = form[k].trim()
            if (v !== (s3[k] ?? "")) out[k] = v
        }
        str("endpoint")
        str("bucket")
        str("region")
        str("prefix")
        if (!isLocked("use_path_style") && form.use_path_style !== s3.use_path_style)
            out.use_path_style = form.use_path_style
        if (!isLocked("access_key_id") && form.access_key_id.trim())
            out.access_key_id = form.access_key_id.trim()
        if (!secretLocked && form.secret_access_key) out.secret_access_key = form.secret_access_key
        return out
    }

    async function run(kind: "save" | "test") {
        const err = validate()
        if (err) {
            toast.error(t("Error"), { description: err })
            return
        }
        setBusy(kind)
        try {
            if (kind === "test") {
                // The test probes the target the form describes, so unchanged
                // editable fields are sent too; env-locked ones stay server-side.
                const probe: BackupS3Update = { ...payload() }
                for (const k of ["endpoint", "bucket", "region", "prefix"] as const) {
                    if (!isLocked(k)) probe[k] = form[k].trim()
                }
                if (!isLocked("use_path_style")) probe.use_path_style = form.use_path_style
                await testBackupStorage(probe)
                toast.success(t("Backup.Storage.TestOK"))
                setTestedValues(fingerprint)
            } else {
                const next = await updateBackupConfig({ s3: payload() })
                toast.success(t("Backup.Storage.Saved"))
                onSaved(next)
            }
        } catch (e) {
            toast.error(kind === "test" ? t("Backup.Storage.TestFailed") : t("Error"), {
                description: (e as Error).message,
            })
        } finally {
            setBusy(null)
        }
    }

    const envHint = (f: string) =>
        isLocked(f) ? (
            <span className="text-muted-foreground text-xs">{t("Backup.Storage.EnvLocked")}</span>
        ) : null

    return (
        <form
            className="space-y-4"
            autoComplete="off"
            onSubmit={(e) => {
                e.preventDefault()
                if (!saveBlocked) void run("save")
            }}
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="backup-s3-endpoint">{t("Backup.Storage.Endpoint")}</Label>
                    <Input
                        id="backup-s3-endpoint"
                        placeholder="https://<account_id>.r2.cloudflarestorage.com"
                        value={form.endpoint}
                        disabled={isLocked("endpoint")}
                        onChange={(e) => set("endpoint", e.target.value)}
                    />
                    {envHint("endpoint")}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="backup-s3-bucket">{t("Backup.Storage.Bucket")}</Label>
                    <Input
                        id="backup-s3-bucket"
                        value={form.bucket}
                        disabled={isLocked("bucket")}
                        onChange={(e) => set("bucket", e.target.value)}
                    />
                    {envHint("bucket")}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="backup-s3-region">{t("Backup.Storage.Region")}</Label>
                    <Input
                        id="backup-s3-region"
                        value={form.region}
                        disabled={isLocked("region")}
                        onChange={(e) => set("region", e.target.value)}
                    />
                    {envHint("region")}
                </div>
                <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="backup-s3-prefix">{t("Backup.Storage.Prefix")}</Label>
                    <Input
                        id="backup-s3-prefix"
                        value={form.prefix}
                        disabled={isLocked("prefix")}
                        onChange={(e) => set("prefix", e.target.value)}
                    />
                    <span className="text-muted-foreground text-xs">
                        {t("Backup.Storage.PrefixHint")}
                    </span>
                    {envHint("prefix")}
                </div>
                <div className="flex items-center gap-3 sm:col-span-2">
                    <Switch
                        id="backup-s3-path-style"
                        checked={form.use_path_style}
                        disabled={isLocked("use_path_style")}
                        onCheckedChange={(v) => set("use_path_style", v)}
                    />
                    <Label htmlFor="backup-s3-path-style">{t("Backup.Storage.PathStyle")}</Label>
                    {envHint("use_path_style")}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="backup-s3-key-id">{t("Backup.Storage.AccessKeyId")}</Label>
                    <Input
                        id="backup-s3-key-id"
                        autoComplete="off"
                        placeholder={
                            config.s3.access_key_id_masked
                                ? config.s3.access_key_id_masked
                                : undefined
                        }
                        value={form.access_key_id}
                        disabled={isLocked("access_key_id")}
                        onChange={(e) => set("access_key_id", e.target.value)}
                    />
                    {config.s3.access_key_id_masked && !isLocked("access_key_id") && (
                        <span className="text-muted-foreground text-xs">
                            {t("Backup.Storage.KeepWhenEmpty")}
                        </span>
                    )}
                    {envHint("access_key_id")}
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="backup-s3-secret" className="flex items-center gap-2">
                        {t("Backup.Storage.SecretAccessKey")}
                        {config.s3.secret_access_key_set && (
                            <Badge variant="secondary">{t("Backup.Storage.SecretSet")}</Badge>
                        )}
                    </Label>
                    <Input
                        id="backup-s3-secret"
                        type="password"
                        autoComplete="new-password"
                        placeholder={
                            config.s3.secret_access_key_set && !needSecret
                                ? t("Backup.Storage.KeepWhenEmpty")
                                : undefined
                        }
                        aria-invalid={needSecret && !form.secret_access_key}
                        className={
                            needSecret && !form.secret_access_key ? "border-destructive" : ""
                        }
                        value={form.secret_access_key}
                        disabled={secretLocked}
                        onChange={(e) => set("secret_access_key", e.target.value)}
                    />
                    {needSecret && config.s3.secret_access_key_set && (
                        <span className="text-destructive text-xs" role="alert">
                            {t("Backup.Storage.SecretRequiredMoved")}
                        </span>
                    )}
                    {envHint("secret_access_key")}
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={!!busy}
                    onClick={() => run("test")}
                >
                    {busy === "test" ? t("Backup.Storage.Testing") : t("Backup.Storage.Test")}
                </Button>
                <Button type="submit" disabled={!!busy || saveBlocked}>
                    {busy === "save" ? t("Loading") + "..." : t("Save")}
                </Button>
            </div>
            {saveBlocked && (
                <p className="text-muted-foreground text-xs">{t("Backup.Storage.TestFirst")}</p>
            )}
        </form>
    )
}
