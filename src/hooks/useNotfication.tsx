import { createContext, useContext, useEffect, useMemo } from "react"
import { useNotificationStore } from "./useNotificationStore"
import { getNotificationGroups } from "@/api/notification-group"
import { getNotification } from "@/api/notification"
import { NotificationContextProps } from "@/types"

const NotificationContext = createContext<NotificationContextProps>({});

interface NotificationProviderProps {
    children: React.ReactNode;
    withNotifier?: boolean;
    withNotifierGroup?: boolean;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children, withNotifier, withNotifierGroup }) => {
    const notifierGroup = useNotificationStore(store => store.notifierGroup);
    const setNotifierGroup = useNotificationStore(store => store.setNotifierGroup);

    const notifiers = useNotificationStore(store => store.notifiers);
    const setNotifier = useNotificationStore(store => store.setNotifier);

    useEffect(() => {
        if (withNotifierGroup)
            (async () => {
                try {
                    const ng = await getNotificationGroups();
                    setNotifierGroup(ng);
                } catch (error) {
                    setNotifierGroup(undefined);
                }
            })();
        if (withNotifier)
            (async () => {
                try {
                    const n = await getNotification();
                    setNotifier(n);
                } catch (error) {
                    setNotifier(undefined);
                }
            })();
    }, [])

    const value: NotificationContextProps = useMemo(() => ({
        notifiers: notifiers,
        notifierGroup: notifierGroup,
    }), [notifiers, notifierGroup]);
    return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export const useNotification = () => {
    return useContext(NotificationContext);
};
