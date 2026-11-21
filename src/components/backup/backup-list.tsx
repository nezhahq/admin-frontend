import { BackupInfo, backupDownloadUrl, deleteBackups, formatBytes } from "@/api/backup"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"

const triggerKey: Record<string, string> = {
    manual: "Backup.Trigger.Manual",
    schedule: "Backup.Trigger.Schedule",
    "pre-restore": "Backup.Trigger.PreRestore",
}

export function BackupList({
    backups,
    loading,
    onChanged,
    onRestore,
}: {
    backups: BackupInfo[]
    loading: boolean
    onChanged: () => void
    onRestore: (b: BackupInfo) => void
}) {
    const { t } = useTranslation()
    const [selected, setSelected] = useState<Set<string>>(new Set())
    const [deleting, setDeleting] = useState(false)

    // Running entries have no object yet and failed ones only live in memory,
    // so only finished backups can be downloaded or restored.
    const selectable = backups.filter((b) => b.status !== "running")
    const visibleSelected = [...selected].filter((n) => selectable.some((b) => b.name === n))

    const toggle = (name: string, v: boolean) =>
        setSelected((cur) => {
            const next = new Set(cur)
            if (v) next.add(name)
            else next.delete(name)
            return next
        })

    async function remove(names: string[]) {
        if (names.length === 0) return
        const manual = backups.some(
            (b) => names.includes(b.name) && b.trigger !== "schedule" && b.status === "success",
        )
        const msg =
            t("Backup.List.ConfirmDelete", { count: names.length }) +
            (manual ? "\n\n" + t("Backup.List.ConfirmDeleteManual") : "")
        if (!window.confirm(msg)) return
        setDeleting(true)
        try {
            await deleteBackups(names)
            toast.success(t("Backup.List.Deleted"))
            setSelected(new Set())
            onChanged()
        } catch (e) {
            toast.error(t("Error"), { description: (e as Error).message })
        } finally {
            setDeleting(false)
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
                <Button
                    variant="destructive"
                    size="sm"
                    disabled={visibleSelected.length === 0 || deleting}
                    onClick={() => remove(visibleSelected)}
                >
                    {t("Backup.List.DeleteSelected", { count: visibleSelected.length })}
                </Button>
                <span className="text-muted-foreground text-xs">{t("Backup.List.Encrypted")}</span>
            </div>
            <Table>
                <TableHeader>
                    <TableRow className="whitespace-nowrap">
                        <TableHead className="w-8">
                            <Checkbox
                                aria-label={t("Backup.List.SelectAll")}
                                checked={
                                    selectable.length > 0 &&
                                    visibleSelected.length === selectable.length
                                }
                                onCheckedChange={(v) =>
                                    setSelected(
                                        v === true
                                            ? new Set(selectable.map((b) => b.name))
                                            : new Set(),
                                    )
                                }
                            />
                        </TableHead>
                        <TableHead>{t("Name")}</TableHead>
                        <TableHead>{t("CreatedAt")}</TableHead>
                        <TableHead>{t("Backup.List.Size")}</TableHead>
                        <TableHead>{t("Backup.List.Trigger")}</TableHead>
                        <TableHead>{t("Status")}</TableHead>
                        <TableHead>{t("Backup.List.Version")}</TableHead>
                        <TableHead>SHA-256</TableHead>
                        <TableHead>{t("Actions")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={9} className="h-24 text-center">
                                {t("Loading")}...
                            </TableCell>
                        </TableRow>
                    ) : backups.length === 0 ? (
                        <TableRow>
                            <TableCell
                                colSpan={9}
                                className="text-muted-foreground h-24 text-center"
                            >
                                {t("NoResults")}
                            </TableCell>
                        </TableRow>
                    ) : (
                        backups.map((b) => {
                            const done = b.status === "success"
                            return (
                                <TableRow key={b.name}>
                                    <TableCell>
                                        <Checkbox
                                            aria-label={b.name}
                                            disabled={b.status === "running"}
                                            checked={selected.has(b.name)}
                                            onCheckedChange={(v) => toggle(b.name, v === true)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-mono text-xs break-all">
                                        {b.name}
                                        {done && !b.key_matches_current && (
                                            <Badge
                                                variant="outline"
                                                className="ml-2"
                                                title={t("Backup.List.OldKeyHint")}
                                            >
                                                {t("Backup.List.OldKey")}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {new Date(b.created_at).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {done ? formatBytes(b.size) : "-"}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {t(triggerKey[b.trigger] ?? b.trigger)}
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge backup={b} />
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {b.nezha_version || "-"}
                                    </TableCell>
                                    <TableCell>
                                        {b.sha256 ? (
                                            <button
                                                type="button"
                                                className="font-mono text-xs underline decoration-dotted"
                                                title={b.sha256}
                                                onClick={async () => {
                                                    await navigator.clipboard.writeText(b.sha256)
                                                    toast(t("Copied"))
                                                }}
                                            >
                                                {b.sha256.slice(0, 8)}
                                            </button>
                                        ) : (
                                            "-"
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            {done && (
                                                <>
                                                    <Button asChild size="sm" variant="outline">
                                                        <a
                                                            href={backupDownloadUrl(b.name)}
                                                            download
                                                        >
                                                            {t("Backup.List.Download")}
                                                        </a>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => onRestore(b)}
                                                    >
                                                        {t("Backup.List.Restore")}
                                                    </Button>
                                                </>
                                            )}
                                            {b.status !== "running" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    disabled={deleting}
                                                    onClick={() => remove([b.name])}
                                                >
                                                    {t("Delete")}
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    )
}

function StatusBadge({ backup }: { backup: BackupInfo }) {
    const { t } = useTranslation()
    if (backup.status === "running")
        return <Badge variant="default">{t("Backup.Status.Running")}</Badge>
    if (backup.status === "failed")
        return (
            <div className="space-y-1">
                <Badge variant="destructive">{t("Backup.Status.Failed")}</Badge>
                {backup.error && (
                    <p className="text-destructive max-w-xs text-xs break-words">{backup.error}</p>
                )}
            </div>
        )
    return <Badge variant="secondary">{t("Backup.Status.Success")}</Badge>
}
