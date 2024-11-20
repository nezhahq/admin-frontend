import { ModelNotification, ModelNotificationGroupResponseItem } from "@/types";

export interface NotificationContextProps {
    notifiers?: ModelNotification[];
    notifierGroup?: ModelNotificationGroupResponseItem[];
}
