import { useAuth } from "@/hooks/useAuth"
import { Navigate } from "react-router-dom"

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { profile } = useAuth()

    if (!profile && window.location.pathname !== "/dashboard/login") {
        return (
            <>
                <Navigate to="/dashboard/login" />
                {children}
            </>
        )
    }

    return children
}

export default ProtectedRoute
