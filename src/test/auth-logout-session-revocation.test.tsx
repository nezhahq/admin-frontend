import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

let profileStore: { id: number; role: number } | undefined
const setProfile = vi.fn((profile: typeof profileStore) => {
    profileStore = profile
})
vi.mock("@/hooks/useMainStore", () => ({
    useMainStore: (selector: any) => selector({ profile: profileStore, setProfile }),
}))
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))
vi.mock("sonner", () => ({ toast: () => {} }))
const navigate = vi.fn()
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }))
vi.mock("@/api/user", () => ({
    getProfile: vi.fn(async () => ({ id: 42, role: 0 })),
    login: vi.fn(async () => {}),
}))

const realFetch = globalThis.fetch

function expireCookie(name: string) {
    document.cookie = name + "=;expires=" + new Date(0).toUTCString() + ";path=/"
}

beforeEach(() => {
    profileStore = { id: 42, role: 0 }
    document.cookie = "nz-jwt=session-token;path=/"
    document.cookie = "nz-csrf=csrf-token;path=/"
})

afterEach(() => {
    globalThis.fetch = realFetch
    expireCookie("nz-jwt")
    expireCookie("nz-csrf")
    document.body.innerHTML = ""
    vi.clearAllMocks()
})

async function renderAndLogout() {
    const { AuthProvider, useAuth } = await import("@/hooks/useAuth")
    const captured: { auth?: ReturnType<typeof useAuth> } = {}
    function Capture() {
        captured.auth = useAuth()
        return null
    }
    await act(async () => {
        render(
            <AuthProvider>
                <Capture />
            </AuthProvider>,
        )
    })
    await act(async () => {
        await captured.auth!.logout()
    })
}

// Deleting cookies in the browser ends nothing on the server. The session has
// to be revoked there, and the request must leave while the cookies that
// authenticate it (and the CSRF token it needs) still exist.
test("logout revokes the session on the server before clearing the cookies", async () => {
    const seen: { url: string; init?: RequestInit; cookiesAtRequest: string }[] = []
    globalThis.fetch = vi.fn(async (input: any, init?: RequestInit) => {
        seen.push({ url: String(input), init, cookiesAtRequest: document.cookie })
        return new Response(JSON.stringify({ success: true }), { status: 200 })
    }) as unknown as typeof fetch

    await renderAndLogout()

    const logoutRequests = seen.filter((request) => request.url.endsWith("/api/v1/logout"))
    expect(logoutRequests).toHaveLength(1)
    expect(logoutRequests[0].init?.method).toBe("POST")
    const sentHeaders = (logoutRequests[0].init?.headers ?? {}) as Record<string, string>
    expect(sentHeaders["X-CSRF-Token"]).toBe("csrf-token")
    expect(logoutRequests[0].cookiesAtRequest).toContain("nz-jwt=session-token")

    expect(document.cookie).not.toContain("nz-jwt")
    expect(profileStore).toBeUndefined()
    expect(navigate).toHaveBeenCalledWith("/dashboard/login", { replace: true })
})

// Dashboards released before the logout endpoint existed answer 404 (or the
// request fails outright). Logging out must still work exactly as it used to.
test.each([
    ["the endpoint does not exist", async () => new Response("not found", { status: 404 })],
    [
        "the request fails",
        async () => {
            throw new TypeError("network down")
        },
    ],
])("logout still clears the local session when %s", async (_name, respond) => {
    globalThis.fetch = vi.fn(respond) as unknown as typeof fetch

    await renderAndLogout()

    expect(document.cookie).not.toContain("nz-jwt")
    expect(profileStore).toBeUndefined()
    expect(navigate).toHaveBeenCalledWith("/dashboard/login", { replace: true })
})
