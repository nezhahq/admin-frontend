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
export function csrfHeaders(method: FetcherMethod, path: string): Record<string, string> {
    if (!isUnsafeMethod(method)) return {}
    if (!isSameOrigin(path)) return {}
    const token = readCookie(csrfCookieName)
    return token ? { [csrfHeaderName]: token } : {}
}

// 非 2xx 时优先取后端 JSON 里的 error：HTTP/2 没有 statusText（恒为空串），
// 只抛 statusText 会让所有 toast(error.message) 弹出空白提示。
async function failedResponseMessage(response: Response): Promise<string> {
    // 401 保持原来的报法：登录流程靠 "Unauthorized" 这个固定文案识别“用户名或密码错误”，
    // 响应体里的文案换掉它会让旧版面板、反向代理返回的 401 不再被识别。
    if (response.status === 401 && response.statusText) return response.statusText
    try {
        const body: unknown = JSON.parse(await response.text())
        if (body && typeof body === "object" && "error" in body) {
            const message = (body as { error: unknown }).error
            if (typeof message === "string" && message !== "") return message
        }
    } catch {
        // 响应体不是 JSON（例如反向代理的错误页）
    }
    return response.statusText || `HTTP ${response.status}`
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
        throw new Error(await failedResponseMessage(response))
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

// 通知后端吊销当前登录会话。只在浏览器端删 cookie 结束不了会话：事先被复制出去的
// token 在过期前一直有效。
//
// 调用方必须等它返回后再清 cookie——请求靠 nz-jwt 认证，还需要 nz-csrf。
// 任何失败都只是静默返回：没有 /logout 接口的旧版面板会回 404，这种情况下
// 登出仍要像以前一样完成本地清理；超时是为了后端无响应时不把用户卡在登出上。
export async function revokeServerSession(timeoutMs = 3000): Promise<void> {
    const path = "/api/v1/logout"
    try {
        await fetch(path, {
            method: FetcherMethod.POST,
            headers: csrfHeaders(FetcherMethod.POST, path),
            signal: AbortSignal.timeout(timeoutMs),
        })
    } catch {
        // 网络失败或超时：继续本地登出
    }
}

export async function swrFetcher<T>(input: string | URL | globalThis.Request, init?: RequestInit) {
    // SWR 默认不带 init，method 为 undefined：必须落到 GET，否则 fetcher 会走
    // 带 body 的分支并对只读请求附加 CSRF 头，把 token 暴露到 GET 请求上。
    const method = (init?.method as FetcherMethod) ?? FetcherMethod.GET
    return fetcher<T>(method, input.toString(), init?.body)
}
