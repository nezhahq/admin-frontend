import { act, render } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, expect, test, vi } from "vitest"

// ProtectedRoute must NOT mount its children while AuthProvider is still
// running the initial getProfile() probe — except for the /dashboard/login
// path itself. Mounting the protected subtree during the probe would fire
// authenticated SWR fetches like /api/v1/setting before auth is confirmed.
// Without this contract, a regression in protect.tsx silently re-introduces
// pre-auth traffic and a flash of protected UI before redirect.

let mockProfile: { id: number; role: number } | undefined
let mockLoading = false
vi.mock("@/hooks/useAuth", () => ({
    useAuth: () => ({ profile: mockProfile, loading: mockLoading }),
}))

beforeEach(() => {
    mockProfile = undefined
    mockLoading = true
})

afterEach(() => {
    document.body.innerHTML = ""
})

function renderAtPath(path: string, child: React.ReactNode) {
    return import("@/routes/protect").then(({ default: ProtectedRoute }) => {
        return act(async () => {
            render(
                <MemoryRouter initialEntries={[path]}>
                    <Routes>
                        <Route
                            path="/dashboard/login"
                            element={
                                <ProtectedRoute>{child}</ProtectedRoute>
                            }
                        />
                        <Route
                            path="/dashboard/*"
                            element={
                                <ProtectedRoute>{child}</ProtectedRoute>
                            }
                        />
                    </Routes>
                </MemoryRouter>,
            )
        })
    })
}

test("ProtectedRoute does not mount children for protected paths while auth is loading", async () => {
    await renderAtPath(
        "/dashboard",
        <div data-testid="protected-child">protected</div>,
    )
    expect(document.querySelector("[data-testid='protected-child']")).toBeNull()
})

test("ProtectedRoute renders children on the login page even while auth is loading", async () => {
    await renderAtPath(
        "/dashboard/login",
        <div data-testid="login-child">login</div>,
    )
    expect(document.querySelector("[data-testid='login-child']")).not.toBeNull()
})

test("ProtectedRoute redirects unauthenticated users without mounting protected children", async () => {
    mockLoading = false
    mockProfile = undefined
    const { default: ProtectedRoute } = await import("@/routes/protect")
    await act(async () => {
        render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Routes>
                    <Route
                        path="/dashboard/login"
                        element={
                            <ProtectedRoute>
                                <div data-testid="login-child">login</div>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/*"
                        element={
                            <ProtectedRoute>
                                <div data-testid="protected-child">protected</div>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </MemoryRouter>,
        )
    })
    expect(document.querySelector("[data-testid='protected-child']")).toBeNull()
    expect(document.querySelector("[data-testid='login-child']")).not.toBeNull()
})

test("ProtectedRoute renders children once an authenticated profile resolves", async () => {
    mockLoading = false
    mockProfile = { id: 1, role: 0 }
    await renderAtPath(
        "/dashboard",
        <div data-testid="protected-child">protected</div>,
    )
    expect(document.querySelector("[data-testid='protected-child']")).not.toBeNull()
})
