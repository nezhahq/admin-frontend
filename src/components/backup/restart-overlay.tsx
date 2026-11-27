import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

// Anonymous endpoint: after a restore every session is cleared, so profile or
// restore/status would only answer 401.
const PROBE_PATH = "/api/v1/setting"

export interface WaitForRestartOptions {
    probe?: () => Promise<boolean>
    intervalMs?: number
    /** How long to wait for the old process to go away before assuming it already restarted. */
    downGraceMs?: number
    timeoutMs?: number
    signal?: AbortSignal
}

async function defaultProbe(): Promise<boolean> {
    try {
        const res = await fetch(PROBE_PATH, { cache: "no-store" })
        return res.ok
    } catch {
        return false
    }
}

/**
 * Resolves true once the dashboard is back after the restart (it first has to
 * go down, or the grace period has to pass), false on timeout or abort.
 */
export async function waitForRestart({
    probe = defaultProbe,
    intervalMs = 2000,
    downGraceMs = 15000,
    timeoutMs = 180000,
    signal,
}: WaitForRestartOptions = {}): Promise<boolean> {
    const start = Date.now()
    let sawDown = false
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
    while (Date.now() - start < timeoutMs) {
        if (signal?.aborted) return false
        await sleep(intervalMs)
        if (signal?.aborted) return false
        const up = await probe()
        if (!up) sawDown = true
        else if (sawDown || Date.now() - start >= downGraceMs) return true
    }
    return false
}

export function RestartOverlay({ active }: { active: boolean }) {
    const { t } = useTranslation()
    const [timedOut, setTimedOut] = useState(false)

    useEffect(() => {
        if (!active) return
        setTimedOut(false)
        const ctrl = new AbortController()
        void waitForRestart({ signal: ctrl.signal }).then((ok) => {
            if (ctrl.signal.aborted) return
            if (ok) window.location.assign("/dashboard/login")
            else setTimedOut(true)
        })
        return () => ctrl.abort()
    }, [active])

    if (!active) return null
    return (
        <div
            role="alertdialog"
            aria-live="assertive"
            className="bg-background/95 fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 p-6 text-center"
        >
            {timedOut ? (
                <>
                    <p className="max-w-md text-sm">{t("Backup.Restart.Timeout")}</p>
                    <Button onClick={() => window.location.assign("/dashboard/login")}>
                        {t("Backup.Restart.GoToLogin")}
                    </Button>
                </>
            ) : (
                <>
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="text-lg font-semibold">{t("Backup.Restart.Title")}</p>
                    <p className="text-muted-foreground max-w-md text-sm">
                        {t("Backup.Restart.Description")}
                    </p>
                </>
            )}
        </div>
    )
}
