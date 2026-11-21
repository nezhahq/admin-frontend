import {
    BACKUP_CONFIG_KEY,
    BACKUP_LIST_KEY,
    BackupConfigView,
    BackupInfo,
    BackupKeyResponse,
    RESTORE_STATUS_KEY,
    RestoreResult,
    createBackup,
    getBackupConfig,
    getRestoreStatus,
    listBackups,
} from "@/api/backup"
import { BackupList } from "@/components/backup/backup-list"
import {
    ChangeBackupPasswordDialog,
    RecoveryKeyDialog,
    ResetBackupPasswordDialog,
    SetBackupPasswordForm,
} from "@/components/backup/password"
import { RestartOverlay } from "@/components/backup/restart-overlay"
import { RestoreDialog, RestoreSource } from "@/components/backup/restore-dialog"
import { BackupScheduleForm } from "@/components/backup/schedule-form"
import { BackupStorageForm } from "@/components/backup/storage-form"
import { SettingsTab } from "@/components/settings-tab"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/useAuth"
import { cn } from "@/lib/utils"
import { ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"
import useSWR from "swr"

const LIST_POLL_MS = 2000

export default function BackupPage() {
    const { t } = useTranslation()
    const { profile, loading } = useAuth()
    const isAdmin = profile?.role === 0

    const config = useSWR<BackupConfigView>(isAdmin ? BACKUP_CONFIG_KEY : null, getBackupConfig)
    const configured = !!config.data?.configured
    const backups = useSWR<BackupInfo[]>(
        isAdmin && configured ? BACKUP_LIST_KEY : null,
        listBackups,
        {
            // Poll only while a backup is in flight.
            refreshInterval: (data) =>
                data?.some((b) => b.status === "running") ? LIST_POLL_MS : 0,
        },
    )
    const restoreStatus = useSWR<RestoreResult | null>(
        isAdmin ? RESTORE_STATUS_KEY : null,
        getRestoreStatus,
    )

    const [creating, setCreating] = useState(false)
    const [restoreSource, setRestoreSource] = useState<RestoreSource | null>(null)
    const [restarting, setRestarting] = useState(false)
    const [changeOpen, setChangeOpen] = useState(false)
    const [resetOpen, setResetOpen] = useState(false)
    const [resetKey, setResetKey] = useState<BackupKeyResponse | null>(null)

    if (loading) return null
    if (!isAdmin) return <Navigate to="/dashboard/settings/api-tokens" replace />

    const cfg = config.data
    const onConfigSaved = (next: BackupConfigView) => {
        void config.mutate(next, { revalidate: true })
        void backups.mutate()
    }

    async function backupNow() {
        setCreating(true)
        try {
            const job = await createBackup()
            await backups.mutate(
                (cur) => [job, ...(cur ?? []).filter((b) => b.name !== job.name)],
                { revalidate: true },
            )
            toast.success(t("Backup.List.Started"))
        } catch (e) {
            toast.error(t("Error"), { description: (e as Error).message })
        } finally {
            setCreating(false)
        }
    }

    const missingStep = !cfg
        ? null
        : !cfg.storage_configured
          ? t("Backup.Setup.NeedStorage")
          : !cfg.encryption
            ? t("Backup.Setup.NeedPassword")
            : null
    const affected = (backups.data ?? []).filter(
        (b) => b.status === "success" && b.key_matches_current,
    ).length

    return (
        <div className="px-3 pb-10">
            <SettingsTab className="mt-6 mb-4 w-full" />
            <div className="mb-4">
                <h1 className="text-xl font-semibold">{t("Backup.Title")}</h1>
                <p className="text-muted-foreground mt-1 max-w-3xl text-sm">
                    {t("Backup.Description")}
                </p>
            </div>

            {restoreStatus.data && <RestoreStatusBanner result={restoreStatus.data} />}

            {config.error && (
                <p className="text-destructive text-sm" role="alert">
                    {t("Results.ErrorFetchingResource", { error: config.error.message })}
                </p>
            )}

            {cfg && !configured && (
                <div className="space-y-4">
                    <SetupStep
                        index={1}
                        title={t("Backup.Setup.Storage")}
                        done={cfg.storage_configured}
                    >
                        <BackupStorageForm
                            config={cfg}
                            onSaved={onConfigSaved}
                            requireTest={!cfg.storage_configured}
                        />
                    </SetupStep>
                    <SetupStep
                        index={2}
                        title={t("Backup.Setup.Password")}
                        done={!!cfg.encryption}
                        disabled={!cfg.storage_configured}
                    >
                        {cfg.storage_configured && (
                            <SetBackupPasswordForm
                                config={cfg}
                                onDone={() => void config.mutate()}
                            />
                        )}
                    </SetupStep>
                    <SetupStep index={3} title={t("Backup.Setup.Schedule")} done={false} disabled>
                        <p className="text-muted-foreground text-sm">
                            {t("Backup.Setup.ScheduleLater")}
                        </p>
                    </SetupStep>
                    <Card data-testid="backup-setup-restore">
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                            <div>
                                <CardTitle className="text-lg">
                                    {t("Backup.Setup.RestoreTitle")}
                                </CardTitle>
                                <CardDescription>
                                    {t("Backup.Setup.RestoreDescription")}
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setRestoreSource({ kind: "upload" })}
                            >
                                {t("Backup.Restore.FromUpload")}
                            </Button>
                        </CardHeader>
                    </Card>
                </div>
            )}

            {cfg && configured && (
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
                            <div>
                                <CardTitle className="text-lg">{t("Backup.List.Title")}</CardTitle>
                                <CardDescription>{t("Backup.List.Description")}</CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setRestoreSource({ kind: "upload" })}
                                >
                                    {t("Backup.Restore.FromUpload")}
                                </Button>
                                <Button onClick={backupNow} disabled={creating}>
                                    {creating ? t("Loading") + "..." : t("Backup.List.BackupNow")}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <BackupList
                                backups={backups.data ?? []}
                                loading={backups.isLoading}
                                onChanged={() => void backups.mutate()}
                                onRestore={(b) => setRestoreSource({ kind: "storage", backup: b })}
                            />
                        </CardContent>
                    </Card>

                    <Section title={t("Backup.Schedule.Title")}>
                        <BackupScheduleForm config={cfg} onSaved={onConfigSaved} />
                    </Section>

                    <Section title={t("Backup.Storage.Title")}>
                        <BackupStorageForm config={cfg} onSaved={onConfigSaved} />
                    </Section>

                    <Section title={t("Backup.Password.Title")}>
                        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                            <dt className="text-muted-foreground">{t("Backup.Password.KeyId")}</dt>
                            <dd className="font-mono">{cfg.encryption?.key_id}</dd>
                            <dt className="text-muted-foreground">{t("CreatedAt")}</dt>
                            <dd>
                                {cfg.encryption?.created_at
                                    ? new Date(cfg.encryption.created_at).toLocaleString()
                                    : "-"}
                            </dd>
                        </dl>
                        <Button
                            className="mt-3"
                            variant="outline"
                            onClick={() => setChangeOpen(true)}
                        >
                            {t("Backup.Password.Change")}
                        </Button>
                        <div className="border-destructive mt-6 rounded border p-4">
                            <p className="text-destructive font-semibold">
                                {t("Backup.Password.DangerZone")}
                            </p>
                            <p className="text-muted-foreground mt-1 text-sm">
                                {t("Backup.Password.ResetDescription")}
                            </p>
                            <Button
                                className="mt-3"
                                variant="destructive"
                                onClick={() => setResetOpen(true)}
                            >
                                {t("Backup.Password.Reset")}
                            </Button>
                        </div>
                    </Section>
                </div>
            )}

            {missingStep && (
                <p className="text-muted-foreground mt-4 text-sm" data-testid="backup-missing-step">
                    {t("Backup.Setup.BackupDisabled", { step: missingStep })}
                </p>
            )}

            {cfg && (
                <>
                    <ChangeBackupPasswordDialog
                        open={changeOpen}
                        onOpenChange={setChangeOpen}
                        minLength={cfg.password_min_length || 12}
                    />
                    <ResetBackupPasswordDialog
                        open={resetOpen}
                        onOpenChange={setResetOpen}
                        minLength={cfg.password_min_length || 12}
                        confirmWord={cfg.reset_confirm_word || "RESET"}
                        affectedBackups={affected}
                        onReset={(res) => setResetKey(res)}
                    />
                    <RecoveryKeyDialog
                        keyResponse={resetKey}
                        onClose={() => {
                            setResetKey(null)
                            void config.mutate()
                            void backups.mutate()
                        }}
                    />
                    <RestoreDialog
                        source={restoreSource}
                        uploadMaxBytes={cfg.upload_max_bytes}
                        onClose={() => setRestoreSource(null)}
                        onApplied={() => {
                            setRestoreSource(null)
                            setRestarting(true)
                        }}
                    />
                </>
            )}
            <RestartOverlay active={restarting} />
        </div>
    )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    )
}

function SetupStep({
    index,
    title,
    done,
    disabled,
    children,
}: {
    index: number
    title: string
    done: boolean
    disabled?: boolean
    children: ReactNode
}) {
    const { t } = useTranslation()
    return (
        <Card className={cn(disabled && "opacity-60")} data-testid={`backup-setup-step-${index}`}>
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <span
                    className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full border text-sm font-semibold",
                        done && "bg-primary text-primary-foreground border-primary",
                    )}
                >
                    {index}
                </span>
                <CardTitle className="text-lg">{title}</CardTitle>
                {done && <span className="text-sm text-green-600">{t("Backup.Setup.Done")}</span>}
            </CardHeader>
            {!disabled && <CardContent>{children}</CardContent>}
        </Card>
    )
}

function RestoreStatusBanner({ result }: { result: RestoreResult }) {
    const { t } = useTranslation()
    const ok = result.status === "success"
    const when = result.finished_at || result.applied_at
    return (
        <div
            role="status"
            data-testid="restore-status-banner"
            className={cn(
                "mb-4 rounded border p-3 text-sm",
                ok
                    ? "border-green-600/40 bg-green-50 dark:bg-green-950/30"
                    : "border-destructive bg-destructive/10",
            )}
        >
            <p className="font-medium">
                {ok
                    ? t("Backup.RestoreStatus.Success", { name: result.name ?? "" })
                    : result.rolled_back
                      ? t("Backup.RestoreStatus.RolledBack", { name: result.name ?? "" })
                      : t("Backup.RestoreStatus.Failed", { name: result.name ?? "" })}
            </p>
            {when && (
                <p className="text-muted-foreground text-xs">{new Date(when).toLocaleString()}</p>
            )}
            {!ok && result.error && <p className="text-destructive mt-1 text-xs">{result.error}</p>}
        </div>
    )
}
