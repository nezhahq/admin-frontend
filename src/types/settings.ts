import i18n from "@/lib/i18n"

export const settingCoverageTypes: Record<number, string> = {
    1: i18n.t("Coverages.Excludes"),
    2: i18n.t("Coverages.Only"),
}

export const nezhaLang: Record<string, string> = {
    "zh-CN": "简体中文（中国大陆）",
    "zh-TW": "正體中文（台灣）",
    "en-US": "English",
    "de-DE": "Deutsch",
}

export const wafBlockReasons: Record<number, string> = {
    1: i18n.t("LoginFailed"),
    2: i18n.t("BruteForceAttackingToken"),
    3: i18n.t("BruteForceAttackingAgentSecret"),
    4: i18n.t("BlockByUser"),
    5: i18n.t("WAFBlockReasonTypeBruteForceOauth2"),
}

export const wafBlockIdentifiers: Record<number, string> = {
    "-127": i18n.t("GrpcAuthFailed"),
    "-126": i18n.t("APITokenInvalid"),
    "-125": i18n.t("UserInvalid"),
    "-124": i18n.t("BlockByUser"),
}
