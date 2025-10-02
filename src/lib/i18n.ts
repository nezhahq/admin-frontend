import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import deTranslation from "../locales/de/translation.json"
import enTranslation from "../locales/en/translation.json"
import esTranslation from "../locales/es/translation.json"
import frTranslation from "../locales/fr/translation.json"
import idTranslation from "../locales/id/translation.json"
import itTranslation from "../locales/it/translation.json"
import ruTranslation from "../locales/ru/translation.json"
import taTranslation from "../locales/ta/translation.json"
import zhCNTranslation from "../locales/zh-CN/translation.json"
import zhTWTranslation from "../locales/zh-TW/translation.json"

const resources = {
    "zh-CN": {
        translation: zhCNTranslation,
    },
    "zh-TW": {
        translation: zhTWTranslation,
    },
    "en-US": {
        translation: enTranslation,
    },
    "ru-RU": {
        translation: ruTranslation,
    },
    "es-ES": {
        translation: esTranslation,
    },
    "de-DE": {
        translation: deTranslation,
    },
    "ta-IN": {
        translation: taTranslation,
    },
    "it-IT": {
        translation: itTranslation,
    },
    "fr-FR": {
        translation: frTranslation,
    },
    "id-ID": {
        translation: idTranslation,
    },
}

const getStoredLanguage = () => {
    return localStorage.getItem("language") || "en-US"
}

i18n.use(initReactI18next).init({
    resources,
    lng: getStoredLanguage(), // 使用localStorage中存储的语言或默认值
    fallbackLng: "en-US", // 当前语言的翻译没有找到时，使用的备选语言
    interpolation: {
        escapeValue: false, // react已经安全地转义
    },
})

i18n.on("languageChanged", (lng) => {
    localStorage.setItem("language", lng)
})

export default i18n
