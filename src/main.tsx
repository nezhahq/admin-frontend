import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
    createBrowserRouter,
    RouterProvider,
} from "react-router-dom";

import './index.css'
import './lib/i18n';

import Root from "./routes/root";
import ErrorPage from "./error-page";
import ProtectedRoute from './routes/protect';
import LoginPage from './routes/login';
import ServerPage from './routes/server';
import ServicePage from './routes/service';
import { AuthProvider } from './hooks/useAuth';
import { TerminalPage } from './components/terminal';
import DDNSPage from './routes/ddns';
import NATPage from './routes/nat';
import ServerGroupPage from './routes/server-group';
import NotificationGroupPage from './routes/notification-group';
import { ServerProvider } from './hooks/useServer';
import { NotificationProvider } from './hooks/useNotfication';
import CronPage from './routes/cron';
import NotificationPage from './routes/notification';
import AlertRulePage from './routes/alert-rule';
import SettingsPage from './routes/settings';
import UserPage from './routes/user';
import WAFPage from './routes/waf';
import ProfilePage from './routes/profile';

const router = createBrowserRouter([
    {
        path: "/dashboard",
        element: <AuthProvider><ProtectedRoute><Root /></ProtectedRoute></AuthProvider>,
        errorElement: <ErrorPage />,
        children: [
            {
                path: "/dashboard/login",
                element: <LoginPage />,
            },
            {
                path: "/dashboard",
                element: <ServerProvider withServerGroup><ServerPage /></ServerProvider>,
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
                path: "/dashboard/notification",
                element: <NotificationProvider withNotifierGroup><NotificationPage /></NotificationProvider>,
            },
            {
                path: "/dashboard/alert-rule",
                element: <NotificationProvider withNotifierGroup><AlertRulePage /></NotificationProvider>,
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
                element: <ServerProvider withServer><ServerGroupPage /></ServerProvider>,
            },
            {
                path: "/dashboard/notification-group",
                element: <NotificationProvider withNotifier><NotificationGroupPage /></NotificationProvider>,
            },
            {
                path: "/dashboard/terminal/:id",
                element: <TerminalPage />,
            },
            {
                path: "/dashboard/profile",
                element: <ServerProvider withServer withServerGroup><ProfilePage /></ServerProvider>,
            },
            {
                path: "/dashboard/settings",
                element: <SettingsPage />,
            },
            {
                path: "/dashboard/settings/user",
                element: <UserPage />,
            },
            {
                path: "/dashboard/settings/waf",
                element: <WAFPage />,
            },
        ]
    },
]);

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <RouterProvider router={router} />
    </StrictMode>,
)
