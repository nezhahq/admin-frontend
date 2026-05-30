import { act, render } from "@testing-library/react"
import { useEffect } from "react"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

let profileStore: { id: number; role: number } | undefined
const setProfileSpy = vi.fn((p: any) => {
    profileStore = p
})

vi.mock("./useMainStore", () => ({}))
vi.mock("@/hooks/useMainStore", () => ({
    useMainStore: (selector: any) =>
        selector({ profile: profileStore, setProfile: setProfileSpy }),
}))

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}))

vi.mock("sonner", () => ({ toast: () => {} }))

const navigate = vi.fn()
vi.mock("react-router-dom", () => ({
    useNavigate: () => navigate,
}))

// Initial getProfile() stays pending forever so loading can only be cleared
// by an explicit login/logout, which is exactly what these tests assert.
let initialProfilePromise: Promise<any>
let getProfileCall = 0
const loginRequest = vi.fn(async () => {})
vi.mock("@/api/user", () => ({
    getProfile: vi.fn(() => {
        getProfileCall++
        if (getProfileCall === 1) return initialProfilePromise
        return Promise.resolve({ id: 42, role: 0 })
    }),
    login: () => loginRequest(),
}))

beforeEach(() => {
    profileStore = undefined
    getProfileCall = 0
    initialProfilePromise = new Promise<any>(() => {})
    setProfileSpy.mockClear()
    navigate.mockClear()
})

afterEach(() => {
    document.body.innerHTML = ""
    vi.clearAllMocks()
})

// AuthProvider starts with loading=true and only clears it in the initial
// mount probe's finally{}. A user can log in while that probe is still in
// flight (ProtectedRoute renders the login page during loading). If login()
// does not clear loading itself, ProtectedRoute keeps returning null for
// /dashboard and the freshly-authenticated user sees a blank screen until the
// unrelated probe settles.
test("login() clears loading even while the initial profile probe is still pending", async () => {
    const { AuthProvider, useAuth } = await import("@/hooks/useAuth")

    const captured: { auth?: ReturnType<typeof useAuth> } = {}
    function Capture() {
        const auth = useAuth()
        useEffect(() => {
            captured.auth = auth
        })
        captured.auth = auth
        return null
    }

    await act(async () => {
        render(
            <AuthProvider>
                <Capture />
            </AuthProvider>,
        )
    })

    // Initial probe still pending -> loading must be true.
    expect(captured.auth!.loading).toBe(true)

    await act(async () => {
        await captured.auth!.login("u", "p")
    })

    // Login succeeded; loading must be false so ProtectedRoute renders.
    expect(profileStore).toEqual({ id: 42, role: 0 })
    expect(captured.auth!.loading).toBe(false)
})

test("loginOauth2() clears loading even while the initial profile probe is still pending", async () => {
    const { AuthProvider, useAuth } = await import("@/hooks/useAuth")

    const captured: { auth?: ReturnType<typeof useAuth> } = {}
    function Capture() {
        const auth = useAuth()
        useEffect(() => {
            captured.auth = auth
        })
        captured.auth = auth
        return null
    }

    await act(async () => {
        render(
            <AuthProvider>
                <Capture />
            </AuthProvider>,
        )
    })

    expect(captured.auth!.loading).toBe(true)

    await act(async () => {
        await captured.auth!.loginOauth2()
    })

    expect(captured.auth!.loading).toBe(false)
})

test("logout() clears loading even while the initial profile probe is still pending", async () => {
    const { AuthProvider, useAuth } = await import("@/hooks/useAuth")

    const captured: { auth?: ReturnType<typeof useAuth> } = {}
    function Capture() {
        const auth = useAuth()
        useEffect(() => {
            captured.auth = auth
        })
        captured.auth = auth
        return null
    }

    await act(async () => {
        render(
            <AuthProvider>
                <Capture />
            </AuthProvider>,
        )
    })

    expect(captured.auth!.loading).toBe(true)

    await act(async () => {
        captured.auth!.logout()
    })

    expect(captured.auth!.loading).toBe(false)
})
