import { ModelNotificationGroupResponseItem } from "@/types"

export interface NotificationIdentifierType {
    id: number
    name: string
}

export interface NotificationStore {
    notifiers?: NotificationIdentifierType[]
    notifierGroup?: ModelNotificationGroupResponseItem[]
    setNotifier: (notifiers?: NotificationIdentifierType[]) => void
    setNotifierGroup: (notifierGroup?: ModelNotificationGroupResponseItem[]) => void
}
