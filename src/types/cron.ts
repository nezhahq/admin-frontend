import i18n from "@/lib/i18n"

export const cronTypes: Record<number, string> = {
    0: i18n.t("Scheduled"),
    1: i18n.t("Trigger"),
}

export const cronCoverageTypes: Record<number, string> = {
    0: i18n.t("Coverages.Only"),
    1: i18n.t("Coverages.Excludes"),
    2: i18n.t("Coverages.Alarmed"),
}
