import { TFunction } from "i18next"

export const settingCoverageTypes = (t: TFunction<"translation", undefined>) => ({
    1: t("Coverages.Excludes"),
    2: t("Coverages.Only"),
})

export const nezhaLang: Record<string, string> = {
    "zh-CN": "简体中文（中国大陆）",
    "zh-TW": "正體中文（台灣）",
    "en-US": "English",
}

export const wafBlockReasons = (t: TFunction<"translation", undefined>) => ({
    1: t("LoginFailed"),
    2: t("BruteForceAttackingToken"),
    3: t("BruteForceAttackingAgentSecret"),
})
