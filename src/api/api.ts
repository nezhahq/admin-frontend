interface CommonResponse<T> {
    success: boolean
    error: string
    data: T
}

function buildUrl(path: string, data?: any): string {
    if (!data) return path
    const url = new URL(window.location.origin + path)
    for (const key in data) {
        url.searchParams.append(key, data[key])
    }
    return url.toString()
}

export enum FetcherMethod {
    GET = "GET",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE",
}

let lastestRefreshTokenAt = 0

const csrfCookieName = "nz-csrf"
const csrfHeaderName = "X-CSRF-Token"

function readCookie(name: string): string {
    const prefix = name + "="
    for (const part of document.cookie.split(";")) {
        const c = part.trim()
        if (c.startsWith(prefix)) return c.slice(prefix.length)
    }
    return ""
}

function isUnsafeMethod(method: FetcherMethod): boolean {
    return method !== FetcherMethod.GET
}

// Only attach the CSRF token to same-origin requests. Keying on HTTP method
// alone would leak the nz-csrf value to any absolute cross-origin URL a caller
// passes in; the double-submit token is meaningful only to our own backend.
function isSameOrigin(path: string): boolean {
    try {
        return new URL(path, window.location.origin).origin === window.location.origin
    } catch {
        return false
    }
}

// Double-submit CSRF: backend requires X-CSRF-Token == nz-csrf cookie on
// cookie-authenticated unsafe methods.
function csrfHeaders(method: FetcherMethod, path: string): Record<string, string> {
    if (!isUnsafeMethod(method)) return {}
    if (!isSameOrigin(path)) return {}
    const token = readCookie(csrfCookieName)
    return token ? { [csrfHeaderName]: token } : {}
}

export async function fetcher<T>(method: FetcherMethod, path: string, data?: any): Promise<T> {
    let response
    if (method === FetcherMethod.GET || method === FetcherMethod.DELETE) {
        response = await fetch(buildUrl(path, data), {
            method: method,
            headers: csrfHeaders(method, path),
        })
    } else {
        response = await fetch(path, {
            method: method,
            headers: {
                "Content-Type": "application/json",
                ...csrfHeaders(method, path),
            },
            body: data ? JSON.stringify(data) : null,
        })
    }
    if (!response.ok) {
        throw new Error(response.statusText)
    }
    const text = await response.text()
    if (text !== "") {
        let responseData: CommonResponse<T>
        try {
            responseData = JSON.parse(text)
        } catch {
            throw new Error("invalid server response")
        }
        if (!responseData.success) {
            throw new Error(responseData.error)
        }
        triggerAutoRefresh()
        return responseData.data
    }
    triggerAutoRefresh()
    return undefined as T
}

// Refresh route is POST behind the CSRF gate. Defer until an nz-csrf cookie is
// available: firing without the header would only 403 and burn the 1h throttle,
// stranding sessions that predate the cookie until the backend seeds one on a
// safe GET.
function triggerAutoRefresh() {
    if (!readCookie(csrfCookieName)) return
    if (
        document.cookie &&
        (!lastestRefreshTokenAt || Date.now() - lastestRefreshTokenAt > 1000 * 60 * 60)
    ) {
        lastestRefreshTokenAt = Date.now()
        fetch("/api/v1/refresh-token", {
            method: "POST",
            headers: csrfHeaders(FetcherMethod.POST, "/api/v1/refresh-token"),
        })
    }
}

export async function swrFetcher<T>(input: string | URL | globalThis.Request, init?: RequestInit) {
    // SWR 默认不带 init，method 为 undefined：必须落到 GET，否则 fetcher 会走
    // 带 body 的分支并对只读请求附加 CSRF 头，把 token 暴露到 GET 请求上。
    const method = (init?.method as FetcherMethod) ?? FetcherMethod.GET
    return fetcher<T>(method, input.toString(), init?.body)
}
