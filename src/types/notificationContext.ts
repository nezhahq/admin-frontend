import { NotificationIdentifierType, ModelNotificationGroupResponseItem } from "@/types";

export interface NotificationContextProps {
    notifiers?: NotificationIdentifierType[];
    notifierGroup?: ModelNotificationGroupResponseItem[];
}
