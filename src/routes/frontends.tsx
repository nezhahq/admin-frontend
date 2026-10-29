import { swrFetcher } from "@/api/api"
import {
    FrontendReleasePage,
    FrontendStatus,
    FrontendTemplate,
    activateFrontend,
    installFrontend,
    listFrontendReleases,
    removeFrontend,
} from "@/api/frontends"
import { SettingsTab } from "@/components/settings-tab"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/useAuth"
import { safeExternalHref } from "@/lib/utils"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Navigate } from "react-router-dom"
import { toast } from "sonner"
import useSWR, { mutate as mutateCache } from "swr"

export default function FrontendsPage() {
    const { t } = useTranslation()
    const { profile, loading } = useAuth()
    const isAdministrator = profile?.role === 0
    const { data, error, mutate } = useSWR<FrontendStatus>(
        isAdministrator ? "/api/v1/frontend" : null,
        swrFetcher,
    )
    const [repository, setRepository] = useState("")
    const [isAdminFrontend, setIsAdminFrontend] = useState(false)
    const [releases, setReleases] = useState<FrontendReleasePage | null>(null)
    const [busy, setBusy] = useState(false)

    if (loading) return null
    if (!isAdministrator) return <Navigate to="/dashboard/settings/api-tokens" replace />

    async function perform(operation: () => Promise<void>) {
        setBusy(true)
        try {
            await operation()
        } catch (error) {
            toast.error(t("Error"), { description: String(error) })
        } finally {
            setBusy(false)
        }
    }

    const loadReleases = (page: number) =>
        perform(async () => {
            const result = await listFrontendReleases(repository.trim(), page)
            setReleases(result)
        })

    const install = (tag: string) =>
        perform(async () => {
            await installFrontend(repository.trim(), tag, isAdminFrontend)
            await mutate()
            await mutateCache("/api/v1/setting")
            toast.success(t("FrontendManager.Installed"))
        })

    const activate = (path: string) =>
        perform(async () => {
            await activateFrontend(path, isAdminFrontend)
            await mutate()
            await mutateCache("/api/v1/setting")
            toast.success(t("FrontendManager.Activated"))
            if (isAdminFrontend) window.location.assign("/dashboard/")
        })

    const remove = (template: FrontendTemplate) => {
        if (
            busy ||
            !window.confirm(
                t("FrontendManager.ConfirmRemove", {
                    name: template.name,
                    version: template.version,
                }),
            )
        )
            return
        // Installation keeps previous versions for rollback; removal is explicit
        // and the backend rechecks active-version protection before deleting files.
        void perform(async () => {
            await removeFrontend(template.path, !!template.is_admin)
            await mutate()
            await mutateCache("/api/v1/setting")
            toast.success(t("FrontendManager.Removed"))
        })
    }

    const selected = isAdminFrontend ? data?.admin_template : data?.user_template
    const templates =
        data?.templates.filter((template) => !!template.is_admin === isAdminFrontend) ?? []

    return (
        <div className="px-3">
            <SettingsTab className="mt-6 mb-4 w-full" />
            <Card>
                <CardContent className="space-y-6 pt-6">
                    <div>
                        <h1 className="text-xl font-semibold">{t("FrontendManager.Title")}</h1>
                        <p className="text-muted-foreground mt-2 text-sm">
                            {t("FrontendManager.Description")}
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="frontend-role">{t("FrontendManager.Target")}</Label>
                        <select
                            id="frontend-role"
                            value={isAdminFrontend ? "admin" : "user"}
                            disabled={busy}
                            onChange={(event) => setIsAdminFrontend(event.target.value === "admin")}
                            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
                        >
                            <option value="user">{t("FrontendManager.User")}</option>
                            <option value="admin">{t("FrontendManager.Admin")}</option>
                        </select>
                    </div>
                    <form
                        onSubmit={(event) => {
                            event.preventDefault()
                            void loadReleases(1)
                        }}
                        className="space-y-3"
                    >
                        <Label htmlFor="frontend-repository">
                            {t("FrontendManager.Repository")}
                        </Label>
                        <Input
                            id="frontend-repository"
                            type="url"
                            required
                            placeholder="https://github.com/owner/frontend"
                            value={repository}
                            disabled={busy}
                            onChange={(event) => {
                                setRepository(event.target.value)
                                setReleases(null)
                            }}
                        />
                        <p className="text-muted-foreground text-sm">
                            {t("FrontendManager.RepositoryHint")}
                        </p>
                        <Button type="submit" disabled={busy || !repository.trim()}>
                            {busy
                                ? t("FrontendManager.Working")
                                : t("FrontendManager.LoadReleases")}
                        </Button>
                    </form>
                    {releases && (
                        <section aria-label={t("FrontendManager.Releases")} className="space-y-3">
                            <h2 className="font-medium">{t("FrontendManager.Releases")}</h2>
                            {releases.releases.length === 0 && (
                                <p>{t("FrontendManager.NoReleases")}</p>
                            )}
                            {releases.releases.map((release) => (
                                <div
                                    key={release.tag_name}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                                >
                                    <div>
                                        <p className="font-medium">
                                            {release.name || release.tag_name}
                                        </p>
                                        <p className="text-muted-foreground text-sm">
                                            {release.tag_name}
                                            {release.prerelease
                                                ? ` · ${t("FrontendManager.Prerelease")}`
                                                : ""}
                                        </p>
                                    </div>
                                    <Button
                                        disabled={busy}
                                        variant="outline"
                                        onClick={() => void install(release.tag_name)}
                                    >
                                        {t("FrontendManager.Install")}
                                    </Button>
                                </div>
                            ))}
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="outline"
                                    disabled={busy || releases.page <= 1}
                                    onClick={() => void loadReleases(releases.page - 1)}
                                >
                                    {t("FrontendManager.Previous")}
                                </Button>
                                <span>{releases.page}</span>
                                <Button
                                    variant="outline"
                                    disabled={busy || !releases.has_more}
                                    onClick={() => void loadReleases(releases.page + 1)}
                                >
                                    {t("FrontendManager.Next")}
                                </Button>
                            </div>
                        </section>
                    )}
                    <section aria-label={t("FrontendManager.Available")} className="space-y-3">
                        <h2 className="font-medium">{t("FrontendManager.Available")}</h2>
                        {error && <p role="alert">{String(error)}</p>}
                        {!data && !error && <p>{t("FrontendManager.Loading")}</p>}
                        {templates.map((template) => (
                            <div
                                key={template.path}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium">
                                        {template.name} · {template.version}
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        {template.custom
                                            ? t("FrontendManager.Custom")
                                            : t("FrontendManager.BuiltIn")}
                                    </p>
                                    <a
                                        href={safeExternalHref(template.repository)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-muted-foreground text-sm break-all underline"
                                    >
                                        {template.repository}
                                    </a>
                                </div>
                                <div className="flex gap-2">
                                    {template.custom &&
                                        !template.is_official &&
                                        data?.user_template !== template.path &&
                                        data?.admin_template !== template.path && (
                                            <Button
                                                variant="destructive"
                                                disabled={busy}
                                                onClick={() => remove(template)}
                                            >
                                                {t("FrontendManager.Remove")}
                                            </Button>
                                        )}
                                    <Button
                                        disabled={busy || selected === template.path}
                                        onClick={() => void activate(template.path)}
                                    >
                                        {selected === template.path
                                            ? t("FrontendManager.Active")
                                            : t("FrontendManager.Activate")}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </section>
                </CardContent>
            </Card>
        </div>
    )
}
