import { useAuth } from "@/hooks/useAuth"
import { Navigate, useLocation } from "react-router-dom"

const LOGIN_PATH = "/dashboard/login"

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { profile, loading } = useAuth()
    const { pathname } = useLocation()

    // While AuthProvider's initial getProfile() round-trip is in flight we
    // can't yet decide between "render protected subtree" and "redirect to
    // login". Two key invariants:
    //   - For the login page itself, render children so the user can log in
    //     without waiting for an unrelated /api/v1/profile probe.
    //   - For every other /dashboard/* path, do NOT mount children — the
    //     protected subtree (Root + Outlet + page) would fire authenticated
    //     SWR fetches like /api/v1/setting before auth is even confirmed,
    //     and a subsequent redirect would leave that work unobserved. A
    //     blank render during the (short) probe avoids that wasted round-trip
    //     and the flash of protected UI before redirect.
    if (loading) {
        if (pathname === LOGIN_PATH) {
            return children
        }
        return null
    }

    if (!profile && pathname !== LOGIN_PATH) {
        // `replace` keeps the unauthenticated URL out of history. Crucially do
        // NOT render `children` alongside Navigate: that would mount the
        // protected subtree for one paint and fire authenticated requests we
        // are about to redirect away from.
        return <Navigate to={LOGIN_PATH} replace />
    }

    return children
}

export default ProtectedRoute
