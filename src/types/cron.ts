import { TFunction } from "i18next"

export const cronTypes = (t: TFunction<"translation", undefined>) => ({
    0: t("Scheduled"),
    1: t("Trigger"),
})

export const cronCoverageTypes = (t: TFunction<"translation", undefined>) => ({
    0: t("Coverages.Only"),
    1: t("Coverages.Excludes"),
    2: t("Coverages.Alarmed"),
})
