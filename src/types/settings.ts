import i18next from "i18next";
export const settingCoverageTypes: Record<number, string> = {
    1: i18next.t("Coverages.Excludes"),
    2: i18next.t("Coverages.Only"),
}

export const nezhaLang: Record<string, string> = {
    "auto": i18next.t("Auto"),
    "zh-CN": "简体中文（中国大陆）",
    "zh-TW": "正體中文（台灣）",
    "en-US": "English",
}

export const wafBlockReasons: Record<number, string> = {
    1: i18next.t("LoginFailed"),
    2: i18next.t("BruteForceAttackingToken"),
    3: i18next.t("BruteForceAttackingAgentSecret"),
}
