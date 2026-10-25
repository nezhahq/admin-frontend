export const MCP_OAUTH_CONSENT_PATH = "/dashboard/mcp/authorize"
const storageKey = "nezha.mcp-oauth-login-return"

// Only this internal route can survive a login/OAuth-provider redirect. Do
// not turn user-controlled return paths into a general external redirect.
export function rememberMCPOAuthReturn(path: string) {
    const url = new URL(path, window.location.origin)
    if (
        !path.startsWith(`${MCP_OAUTH_CONSENT_PATH}?`) ||
        url.origin !== window.location.origin ||
        url.pathname !== MCP_OAUTH_CONSENT_PATH ||
        path.length > 10000
    )
        return
    try {
        sessionStorage.setItem(
            storageKey,
            JSON.stringify({ path, expires: Date.now() + 10 * 60 * 1000 }),
        )
    } catch {
        // Login must still work when storage is unavailable; restart linking afterward.
    }
}

export function clearMCPOAuthReturn() {
    try {
        sessionStorage.removeItem(storageKey)
    } catch {
        /* Storage may be disabled. */
    }
}

export function consumeMCPOAuthReturn(): string {
    try {
        const stored = sessionStorage.getItem(storageKey)
        clearMCPOAuthReturn()
        if (!stored) return "/dashboard"
        const { path, expires } = JSON.parse(stored)
        if (
            typeof path !== "string" ||
            typeof expires !== "number" ||
            expires <= Date.now() ||
            path.length > 10000
        )
            return "/dashboard"
        const url = new URL(path, window.location.origin)
        if (
            path.startsWith(`${MCP_OAUTH_CONSENT_PATH}?`) &&
            url.origin === window.location.origin &&
            url.pathname === MCP_OAUTH_CONSENT_PATH
        )
            return path
    } catch {
        /* Untrusted or unavailable storage never controls navigation. */
    }
    return "/dashboard"
}

export function followMCPOAuthCallback(redirect: string, registeredRedirect: string) {
    const url = new URL(redirect)
    const registered = new URL(registeredRedirect)
    if (
        url.protocol !== "https:" ||
        url.origin !== registered.origin ||
        url.pathname !== registered.pathname ||
        url.username ||
        url.password ||
        url.hash
    ) {
        throw new Error("Invalid OAuth callback")
    }
    window.location.assign(url.href)
}
