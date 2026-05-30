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

// Deferred initial getProfile() so we can resolve/reject it AFTER login().
let rejectInitial: (e: any) => void
const initialProfilePromise = new Promise((_res, rej) => {
    rejectInitial = rej
})
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
    setProfileSpy.mockClear()
    navigate.mockClear()
})

afterEach(() => {
    document.body.innerHTML = ""
    vi.clearAllMocks()
})

// The AuthProvider fires getProfile() on mount. While that probe is in flight a
// user can submit the login form (ProtectedRoute renders the login page during
// loading). If the in-flight probe later REJECTS (e.g. it 401'd because the
// user was not yet authenticated), its catch{} must NOT clobber the profile a
// successful login() already set — otherwise the freshly-authenticated user is
// bounced back to the login page.
test("late-rejecting initial profile probe does not clobber a successful login", async () => {
    const { AuthProvider, useAuth } = await import("@/hooks/useAuth")

    const captured: { auth?: ReturnType<typeof useAuth> } = {}
    function Capture() {
        const auth = useAuth()
        useEffect(() => {
            captured.auth = auth
        })
        return null
    }

    await act(async () => {
        render(
            <AuthProvider>
                <Capture />
            </AuthProvider>,
        )
    })

    // User logs in while the initial probe is still pending.
    await act(async () => {
        await captured.auth!.login("u", "p")
    })
    expect(profileStore).toEqual({ id: 42, role: 0 })

    // Now the stale initial probe rejects (it was a pre-auth 401).
    await act(async () => {
        rejectInitial(new Error("401"))
        await initialProfilePromise.catch(() => {})
    })

    // The logged-in profile must survive.
    expect(profileStore).toEqual({ id: 42, role: 0 })
    expect(setProfileSpy).not.toHaveBeenLastCalledWith(undefined)
})
