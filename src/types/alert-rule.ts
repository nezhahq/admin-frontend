import { TFunction } from "i18next"

export const triggerModes = (t: TFunction<"translation", undefined>) => ({
    0: t("Always"),
    1: t("Once"),
})
