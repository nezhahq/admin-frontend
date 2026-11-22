import i18n from "@/lib/i18n"
import { nezhaLang } from "@/types/settings"
import { expect, test } from "vitest"

// Every translation file shipped under src/locales must be wired into i18n,
// otherwise users of that language silently fall back to en-US.
const localeFiles = import.meta.glob<Record<string, unknown>>("../locales/*/translation.json", {
    eager: true,
    import: "default",
})

const resources = i18n.options.resources ?? {}
const registeredTranslations = Object.values(resources).map((r) => r.translation)

test("every locale directory is registered as an i18n resource", () => {
    const localeDirs = Object.keys(localeFiles)
    expect(localeDirs.length).toBeGreaterThan(0)

    const unregistered = Object.entries(localeFiles)
        .filter(([, translation]) => !registeredTranslations.includes(translation))
        .map(([path]) => path.split("/").slice(-2)[0])

    expect(unregistered).toEqual([])
})

test("every registered language is selectable in settings", () => {
    expect(Object.keys(nezhaLang).sort()).toEqual(Object.keys(resources).sort())
})

test("selecting pt-BR shows the Brazilian Portuguese translation", async () => {
    const previous = i18n.language
    try {
        await i18n.changeLanguage("pt-BR")
        expect(i18n.t("nezha")).toBe("Nezha Monitoramento")
    } finally {
        await i18n.changeLanguage(previous)
    }
})
