// NOTE: Do not modify the import order unless absolutely necessary.
import { Suspense, lazy } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createBrowserRouter } from "react-router-dom"

import "./index.css"
import "./lib/i18n"

import { AuthProvider } from "./hooks/useAuth"
import { NotificationProvider } from "./hooks/useNotfication"
import { ServerProvider } from "./hooks/useServer"

import Root from "./routes/root"
import ErrorPage from "./error-page"
import ProtectedRoute from "./routes/protect"

// Route pages are split into their own chunks. The shell (Root, providers,
// error page) stays eager because every navigation needs it; anything below is
// only fetched when that page is actually visited.
//
// IMPORTANT: adding or removing a route path here must be mirrored in
// cmd/dashboard/controller/controller.go (frontendPageUrlRegistry), otherwise a
// hard refresh on the new path returns 404 even though client-side navigation
// works.
const CronPage = lazy(() => import("./routes/cron"))
const LoginPage = lazy(() => import("./routes/login"))
const ServerPage = lazy(() => import("./routes/server"))
const ServicePage = lazy(() => import("./routes/service"))
const DDNSPage = lazy(() => import("./routes/ddns"))
const NATPage = lazy(() => import("./routes/nat"))
const NotificationGroupPage = lazy(() => import("./routes/notification-group"))
const ServerGroupPage = lazy(() => import("./routes/server-group"))
const AlertRulePage = lazy(() => import("./routes/alert-rule"))
const NotificationPage = lazy(() => import("./routes/notification"))
const OnlineUserPage = lazy(() => import("./routes/online-user"))
const ProfilePage = lazy(() => import("./routes/profile"))
const SettingsPage = lazy(() => import("./routes/settings"))
const TransferPage = lazy(() => import("./routes/transfer"))
const UserPage = lazy(() => import("./routes/user"))
const WAFPage = lazy(() => import("./routes/waf"))
const ApiTokensPage = lazy(() => import("./routes/api-tokens"))
const TerminalPage = lazy(() =>
    import("./components/terminal").then((m) => ({ default: m.TerminalPage })),
)

function PageFallback() {
    return (
        <div className="flex min-h-[60vh] w-full items-center justify-center" aria-busy="true">
            <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        </div>
    )
}

const router = createBrowserRouter([
    {
        path: "/dashboard",
        element: (
            <AuthProvider>
                <ProtectedRoute>
                    <Suspense fallback={<PageFallback />}>
                        <Root />
                    </Suspense>
                </ProtectedRoute>
            </AuthProvider>
        ),
        errorElement: <ErrorPage />,
        children: [
            {
                path: "/dashboard/login",
                element: <LoginPage />,
            },
            {
                path: "/dashboard",
                element: (
                    <ServerProvider withServerGroup>
                        <ServerPage />
                    </ServerProvider>
                ),
            },
            {
                path: "/dashboard/service",
                element: (
                    <ServerProvider withServer>
                        <NotificationProvider withNotifierGroup>
                            <ServicePage />
                        </NotificationProvider>
                    </ServerProvider>
                ),
            },
            {
                path: "/dashboard/cron",
                element: (
                    <ServerProvider withServer>
                        <NotificationProvider withNotifierGroup>
                            <CronPage />
                        </NotificationProvider>
                    </ServerProvider>
                ),
            },
            {
                path: "/dashboard/alert-rule",
                element: (
                    <NotificationProvider withNotifierGroup>
                        <AlertRulePage />
                    </NotificationProvider>
                ),
            },
            {
                path: "/dashboard/ddns",
                element: <DDNSPage />,
            },
            {
                path: "/dashboard/nat",
                element: <NATPage />,
            },
            {
                path: "/dashboard/server-group",
                element: (
                    <ServerProvider withServer>
                        <ServerGroupPage />
                    </ServerProvider>
                ),
            },
            {
                path: "/dashboard/notification-group",
                element: (
                    <NotificationProvider withNotifier>
                        <NotificationGroupPage />
                    </NotificationProvider>
                ),
            },
            {
                path: "/dashboard/terminal/:id",
                element: <TerminalPage />,
            },
            {
                path: "/dashboard/notification",
                element: (
                    <NotificationProvider withNotifierGroup>
                        <NotificationPage />
                    </NotificationProvider>
                ),
            },
            {
                path: "/dashboard/profile",
                element: (
                    <ServerProvider withServer withServerGroup>
                        <ProfilePage />
                    </ServerProvider>
                ),
            },
            {
                path: "/dashboard/settings",
                element: (
                    <NotificationProvider withNotifierGroup>
                        <SettingsPage />
                    </NotificationProvider>
                ),
            },
            {
                path: "/dashboard/settings/user",
                element: <UserPage />,
            },
            {
                path: "/dashboard/settings/waf",
                element: <WAFPage />,
            },
            {
                path: "/dashboard/settings/online-user",
                element: <OnlineUserPage />,
            },
            {
                path: "/dashboard/settings/api-tokens",
                element: <ApiTokensPage />,
            },
            {
                path: "/dashboard/transfer",
                element: <TransferPage />,
            },
        ],
    },
])

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />)
