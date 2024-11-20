import { ModelNotification, ModelNotificationGroupResponseItem } from "@/types";

export interface NotificationStore {
    notifiers?: ModelNotification[];
    notifierGroup?: ModelNotificationGroupResponseItem[];
    setNotifier: (notifiers?: ModelNotification[]) => void;
    setNotifierGroup: (notifierGroup?: ModelNotificationGroupResponseItem[]) => void;
}
