import i18next from "i18next";
export const cronTypes: Record<number, string> = {
    0: i18next.t("Scheduled"),
    1: i18next.t("Trigger"),
}

export const cronCoverageTypes: Record<number, string> = {
    0: i18next.t("Coverages.Only"),
    1: i18next.t("Coverages.Excludes"),
    2: i18next.t("Coverages.Alarmed"),
}

