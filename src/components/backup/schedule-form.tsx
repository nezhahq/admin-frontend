import { BackupConfigView, updateBackupConfig } from "@/api/backup"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

export const MAX_RETENTION = 100

/** Six whitespace-separated fields (seconds first), like the cron task page. */
export function looksLikeCron6(v: string): boolean {
    return v.trim().split(/\s+/).length === 6
}

export function parseRetention(v: string): number | null {
    if (!/^\d+$/.test(v.trim())) return null
    const n = Number(v)
    return n >= 1 && n <= MAX_RETENTION ? n : null
}

export function BackupScheduleForm({
    config,
    disabled,
    onSaved,
}: {
    config: BackupConfigView
    disabled?: boolean
    onSaved: (next: BackupConfigView) => void
}) {
    const { t } = useTranslation()
    const [enabled, setEnabled] = useState(config.schedule.enabled)
    const [cron, setCron] = useState(config.schedule.cron)
    const [retention, setRetention] = useState(String(config.schedule.retention))
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        setEnabled(config.schedule.enabled)
        setCron(config.schedule.cron)
        setRetention(String(config.schedule.retention))
    }, [config])

    const cronInvalid = !looksLikeCron6(cron)
    const retentionValue = parseRetention(retention)

    async function submit() {
        if (cronInvalid) {
            toast.error(t("Error"), { description: t("Backup.Schedule.CronInvalid") })
            return
        }
        if (retentionValue === null) {
            toast.error(t("Error"), {
                description: t("Backup.Schedule.RetentionInvalid", { max: MAX_RETENTION }),
            })
            return
        }
        setBusy(true)
        try {
            const next = await updateBackupConfig({
                schedule: { enabled, cron: cron.trim(), retention: retentionValue },
            })
            toast.success(t("Backup.Schedule.Saved"))
            onSaved(next)
        } catch (e) {
            toast.error(t("Error"), { description: (e as Error).message })
        } finally {
            setBusy(false)
        }
    }

    const nextRun = config.schedule.enabled && config.schedule.next_run_at
    return (
        <form
            className="grid max-w-xl gap-4"
            onSubmit={(e) => {
                e.preventDefault()
                void submit()
            }}
        >
            <div className="flex items-center gap-3">
                <Switch
                    id="backup-schedule-enabled"
                    checked={enabled}
                    disabled={disabled}
                    onCheckedChange={setEnabled}
                />
                <Label htmlFor="backup-schedule-enabled">{t("Backup.Schedule.Enabled")}</Label>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="backup-schedule-cron">{t("Backup.Schedule.Cron")}</Label>
                <Input
                    id="backup-schedule-cron"
                    className="font-mono"
                    placeholder="0 0 3 * * *"
                    value={cron}
                    disabled={disabled}
                    aria-invalid={cronInvalid}
                    onChange={(e) => setCron(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">
                    {t("Backup.Schedule.CronHint")}
                </span>
                <span className="text-muted-foreground text-xs" data-testid="backup-next-run">
                    {t("Backup.Schedule.NextRun")}:{" "}
                    {nextRun
                        ? new Date(config.schedule.next_run_at as string).toLocaleString()
                        : "-"}
                </span>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="backup-schedule-retention">{t("Backup.Schedule.Retention")}</Label>
                <Input
                    id="backup-schedule-retention"
                    type="number"
                    min={1}
                    max={MAX_RETENTION}
                    value={retention}
                    disabled={disabled}
                    aria-invalid={retentionValue === null}
                    onChange={(e) => setRetention(e.target.value)}
                />
                <span className="text-muted-foreground text-xs">
                    {t("Backup.Schedule.RetentionHint")}
                </span>
            </div>
            <div>
                <Button type="submit" disabled={busy || disabled}>
                    {busy ? t("Loading") + "..." : t("Save")}
                </Button>
            </div>
        </form>
    )
}
