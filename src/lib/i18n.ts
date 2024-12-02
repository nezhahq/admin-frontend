import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslation from "../locales/en/translation.json";
import itTranslation from "../locales/it/translation.json";
import zhCNTranslation from "../locales/zh-CN/translation.json";
import zhTWTranslation from "../locales/zh-TW/translation.json";

const resources = {
    en: {
        translation: enTranslation,
    },
    it: {
        translation: itTranslation,
    },
    "zh-CN": {
        translation: zhCNTranslation,
    },
    "zh-TW": {
        translation: zhTWTranslation,
    },
};

const getStoredLanguage = () => {
    return localStorage.getItem("language") || "zh-CN";
};

i18n.use(initReactI18next)
    .init({
        resources,
        lng: getStoredLanguage(), // 使用localStorage中存储的语言或默认值
        fallbackLng: "en", // 当前语言的翻译没有找到时，使用的备选语言
        interpolation: {
            escapeValue: false, // react已经安全地转义
        },
    });

i18n.on("languageChanged", (lng) => {
    localStorage.setItem("language", lng);
});

export default i18n;