import { useEffect, useState } from "react"

type SVGProps = React.ComponentPropsWithoutRef<"svg">
type IconMarkupState =
    | { status: "ready"; icon: ParsedIconMarkup }
    | { status: "missing" }

type ParsedIconMarkup = {
    title?: string
    viewBox: string
    path: string
}

const simpleIconModules = import.meta.glob("/node_modules/simple-icons/icons/*.svg", {
    query: "?raw",
    import: "default",
})

const iconLoadersBySlug = Object.fromEntries(
    Object.entries(simpleIconModules).map(([path, loader]) => [
        path.slice(path.lastIndexOf("/") + 1, -".svg".length),
        loader as () => Promise<string>,
    ]),
)

const iconMarkupCache = new Map<string, IconMarkupState>()

function toProviderSlug(provider: string) {
    return provider.trim().replace(/[^a-z0-9]+/gi, "").toLowerCase()
}

function loadProviderIconMarkup(provider: string) {
    const loader = iconLoadersBySlug[toProviderSlug(provider)]
    return loader ? loader() : null
}

function parseIconMarkup(markup: string): ParsedIconMarkup | null {
    const viewBox = markup.match(/viewBox="([^"]+)"/i)?.[1] ?? "0 0 24 24"
    const title = markup.match(/<title>([^<]*)<\/title>/i)?.[1]
    const path = markup.match(/<path d="([^"]+)"/i)?.[1]

    if (!path) {
        return null
    }

    return { title, viewBox, path }
}

async function loadProviderIcon(provider: string): Promise<IconMarkupState> {
    const markup = await loadProviderIconMarkup(provider)
    if (!markup) {
        return { status: "missing" }
    }

    const parsed = parseIconMarkup(markup)
    if (!parsed) {
        return { status: "missing" }
    }

    return { status: "ready", icon: parsed }
}

export function OAuthProviderIcon({
    provider,
    title,
    ...props
}: SVGProps & { provider: string; title?: string }) {
    const providerSlug = toProviderSlug(provider)
    const [iconState, setIconState] = useState<IconMarkupState | null>(() => {
        return iconMarkupCache.get(providerSlug) ?? null
    })

    useEffect(() => {
        if (iconMarkupCache.has(providerSlug)) {
            setIconState(iconMarkupCache.get(providerSlug) ?? null)
            return
        }

        let cancelled = false
        loadProviderIcon(provider)
            .then((result) => {
                if (cancelled) return
                iconMarkupCache.set(providerSlug, result)
                setIconState(result)
            })
            .catch(() => {
                if (cancelled) return
                const missingState = { status: "missing" } as const
                iconMarkupCache.set(providerSlug, missingState)
                setIconState(missingState)
            })

        return () => {
            cancelled = true
        }
    }, [provider, providerSlug])

    if (!iconState || iconState.status !== "ready") {
        return null
    }

    const iconTitle = title ?? iconState.icon.title

    return (
        <svg
            viewBox={iconState.icon.viewBox}
            fill="currentColor"
            aria-hidden={iconTitle ? undefined : "true"}
            role={iconTitle ? "img" : undefined}
            {...props}
        >
            {iconTitle ? <title>{iconTitle}</title> : null}
            <path d={iconState.icon.path} />
        </svg>
    )
}
