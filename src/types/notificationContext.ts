import { ModelNotificationGroupResponseItem, NotificationIdentifierType } from "@/types"

export interface NotificationContextProps {
    notifiers?: NotificationIdentifierType[]
    notifierGroup?: ModelNotificationGroupResponseItem[]
}
