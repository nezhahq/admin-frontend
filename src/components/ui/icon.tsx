import { useEffect, useState } from "react"

type SVGProps = React.ComponentPropsWithoutRef<"svg">

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

const iconMarkupCache = new Map<string, string | null>()

function toProviderSlug(provider: string) {
    return provider.trim().replace(/[^a-z0-9]+/gi, "").toLowerCase()
}

function loadProviderIconMarkup(provider: string) {
    const loader = iconLoadersBySlug[toProviderSlug(provider)]
    return loader ? loader() : null
}

function getSvgViewBox(markup: string) {
    return markup.match(/viewBox="([^"]+)"/i)?.[1] ?? "0 0 24 24"
}

function getSvgInnerMarkup(markup: string) {
    return markup
        .replace(/^<svg[^>]*>/i, "")
        .replace(/<\/svg>\s*$/i, "")
        .trim()
}

export function OAuthProviderIcon({
    provider,
    title,
    ...props
}: SVGProps & { provider: string; title?: string }) {
    const providerSlug = toProviderSlug(provider)
    const [iconMarkup, setIconMarkup] = useState<string | null>(() => {
        return iconMarkupCache.get(providerSlug) ?? null
    })

    useEffect(() => {
        const cached = iconMarkupCache.get(providerSlug)
        if (cached !== undefined) {
            setIconMarkup(cached)
            return
        }

        const loadPromise = loadProviderIconMarkup(provider)
        if (!loadPromise) {
            iconMarkupCache.set(providerSlug, null)
            setIconMarkup(null)
            return
        }

        let cancelled = false
        loadPromise
            .then((markup) => {
                if (cancelled) return
                iconMarkupCache.set(providerSlug, markup)
                setIconMarkup(markup)
            })
            .catch(() => {
                if (cancelled) return
                iconMarkupCache.set(providerSlug, null)
                setIconMarkup(null)
            })

        return () => {
            cancelled = true
        }
    }, [provider, providerSlug])

    if (!iconMarkup) {
        return null
    }

    return (
        <svg
            viewBox={getSvgViewBox(iconMarkup)}
            fill="currentColor"
            aria-hidden={title ? undefined : "true"}
            role={title ? "img" : undefined}
            {...props}
        >
            {title ? <title>{title}</title> : null}
            <g dangerouslySetInnerHTML={{ __html: getSvgInnerMarkup(iconMarkup) }} />
        </svg>
    )
}
