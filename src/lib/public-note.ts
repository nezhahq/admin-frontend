import { z } from "zod"

import i18n from "./i18n"

/**
 * Zod schema for PublicNote
 * Conventions:
 * - All fields are strings and may be empty
 * - IPv4/IPv6/autoRenewal must be "0" or "1"
 * - cycle is one of Day/Week/Month/Year
 * - Date fields can be empty, ISO-like, or the special value "0000-00-00T23:59:59+08:00"
 */
export const PublicNoteSchema = z.object({
    billingDataMod: z.object({
        startDate: z.string().optional().default(""),
        endDate: z.string().optional().default(""),
        autoRenewal: z.string().optional().default(""),
        cycle: z.string().optional().default(""),
        amount: z.string().optional().default(""),
    }),
    planDataMod: z.object({
        bandwidth: z.string().optional().default(""),
        trafficVol: z.string().optional().default(""),
        trafficType: z.string().optional().default(""),
        IPv4: z.string().optional().default("0"),
        IPv6: z.string().optional().default("0"),
        networkRoute: z.string().optional().default(""),
        extra: z.string().optional().default(""),
    }),
})

export type PublicNote = z.infer<typeof PublicNoteSchema>

export const defaultPublicNote: PublicNote = {
    billingDataMod: {
        startDate: "",
        endDate: "",
        autoRenewal: "",
        cycle: "",
        amount: "",
    },
    planDataMod: {
        bandwidth: "",
        trafficVol: "",
        trafficType: "",
        IPv4: "0",
        IPv6: "0",
        networkRoute: "",
        extra: "",
    },
}

export const isValidISOLike = (v: string) => {
    if (!v) return true
    if (v === "0000-00-00T23:59:59+08:00") return true
    const d = new Date(v)
    return !isNaN(d.getTime())
}

export const normalizeISO = (v: string) => {
    if (!v) return v
    if (v === "0000-00-00T23:59:59+08:00") return v
    const date = new Date(v)
    return isNaN(date.getTime()) ? v : date.toISOString()
}

export const pruneEmpty = (obj: any): any => {
    if (obj === null || obj === undefined) return obj
    if (typeof obj !== "object") return obj
    const result: any = Array.isArray(obj) ? [] : {}
    for (const key of Object.keys(obj)) {
        const val = (obj as any)[key]
        if (typeof val === "string") {
            const trimmed = val.trim()
            if (trimmed === "") continue
            result[key] = val
        } else if (typeof val === "object" && val !== null) {
            const prunedChild = pruneEmpty(val)
            if (Array.isArray(prunedChild)) {
                if (prunedChild.length > 0) result[key] = prunedChild
            } else {
                if (Object.keys(prunedChild).length > 0) result[key] = prunedChild
            }
        } else {
            result[key] = val
        }
    }
    return result
}

/**
 * Parse a string into PublicNote; return the default object if not valid JSON or validation fails.
 */
export const parsePublicNote = (s?: string): PublicNote => {
    if (!s) return defaultPublicNote
    try {
        const obj = JSON.parse(s)
        const parsed = PublicNoteSchema.safeParse(obj)
        if (parsed.success) {
            const v = parsed.data
            return {
                billingDataMod: {
                    startDate: v.billingDataMod.startDate ?? "",
                    endDate: v.billingDataMod.endDate ?? "",
                    autoRenewal: v.billingDataMod.autoRenewal ?? "",
                    cycle: v.billingDataMod.cycle ?? "",
                    amount: v.billingDataMod.amount ?? "",
                },
                planDataMod: {
                    bandwidth: v.planDataMod.bandwidth ?? "",
                    trafficVol: v.planDataMod.trafficVol ?? "",
                    trafficType: v.planDataMod.trafficType ?? "",
                    IPv4: v.planDataMod.IPv4 === "1" ? "1" : "0",
                    IPv6: v.planDataMod.IPv6 === "1" ? "1" : "0",
                    networkRoute: v.planDataMod.networkRoute ?? "",
                    extra: v.planDataMod.extra ?? "",
                },
            }
        }
        return defaultPublicNote
    } catch {
        return defaultPublicNote
    }
}

/**
 * Validate with zod and convert to a UI-friendly error map.
 * Error keys follow the component's path naming; messages provided via i18n.t.
 */
export const validatePublicNote = (pn: PublicNote) => {
    const errors: Partial<Record<string, string>> = {}

    // Structural and enum validations
    if (pn.billingDataMod.autoRenewal && !/^(0|1)$/.test(pn.billingDataMod.autoRenewal)) {
        errors["billing.autoRenewal"] = i18n.t("Validation.MustBe0Or1")
    }
    if (pn.billingDataMod.cycle && !/^(Day|Week|Month|Year)$/i.test(pn.billingDataMod.cycle)) {
        errors["billing.cycle"] = i18n.t("Validation.MustBeDayWeekMonthYear")
    }
    if (pn.planDataMod.trafficType && !/^(1|2)$/.test(pn.planDataMod.trafficType)) {
        errors["plan.trafficType"] = i18n.t("Validation.MustBe1Or2")
    }
    if (!/^(0|1)$/.test(pn.planDataMod.IPv4)) {
        errors["plan.IPv4"] = i18n.t("Validation.MustBe0Or1")
    }
    if (!/^(0|1)$/.test(pn.planDataMod.IPv6)) {
        errors["plan.IPv6"] = i18n.t("Validation.MustBe0Or1")
    }

    // Date validity checks
    if (pn.billingDataMod.startDate && !isValidISOLike(pn.billingDataMod.startDate)) {
        errors["billing.startDate"] = i18n.t("Validation.InvalidDate")
    }
    if (pn.billingDataMod.endDate && !isValidISOLike(pn.billingDataMod.endDate)) {
        errors["billing.endDate"] = i18n.t("Validation.InvalidDate")
    }

    return { errors, valid: Object.keys(errors).length === 0 }
}

/**
 * Detect default mode from string: JSON matching schema -> "structured"; otherwise "raw".
 */
export const detectPublicNoteMode = (s?: string): "structured" | "raw" => {
    if (!s) return "raw"
    try {
        const obj = JSON.parse(s)
        const parsed = PublicNoteSchema.safeParse(obj)
        return parsed.success ? "structured" : "raw"
    } catch {
        return "raw"
    }
}

/**
 * Immutable patch by path, for use in component wrappers around setPublicNoteObj.
 * Example path: "billingDataMod.startDate"
 */
export const applyPublicNotePatch = (obj: PublicNote, path: string, value: string): PublicNote => {
    const keys = path.split(".")
    const draft: any = structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj))
    let cur: any = draft
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        cur[k] = { ...(cur[k] ?? {}) }
        cur = cur[k]
    }
    cur[keys[keys.length - 1]] = value
    return draft
}

/**
 * Update a date field while preserving time parts: if the previous value is a valid date,
 * keep hours/minutes/seconds. Path example: "billingDataMod.startDate" | "billingDataMod.endDate"
 */
export const applyPublicNoteDate = (obj: PublicNote, path: string, date: Date): PublicNote => {
    const keys = path.split(".")
    const draft: any = structuredClone ? structuredClone(obj) : JSON.parse(JSON.stringify(obj))

    // Read previous value to preserve time components
    let curRead: any = draft
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        curRead = (curRead as any)[k]
        if (!curRead) break
    }
    const leafKey = keys[keys.length - 1]
    const prevVal: string | undefined = curRead ? curRead[leafKey] : undefined

    const d = new Date(date)
    if (prevVal) {
        const pd = new Date(prevVal)
        if (!isNaN(pd.getTime())) {
            d.setHours(pd.getHours(), pd.getMinutes(), pd.getSeconds(), 0)
        }
    }

    // Write back
    let curWrite: any = draft
    for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i]
        curWrite[k] = { ...(curWrite[k] ?? {}) }
        curWrite = curWrite[k]
    }
    curWrite[leafKey] = d.toISOString()
    return draft
}

/**
 * Toggle the special "no expiry" value for endDate.
 */
export const toggleEndNoExpiry = (obj: PublicNote): PublicNote => {
    const NO_EXPIRY = "0000-00-00T23:59:59+08:00"
    const current = obj.billingDataMod.endDate
    const next = current === NO_EXPIRY ? "" : NO_EXPIRY
    return applyPublicNotePatch(obj, "billingDataMod.endDate", next)
}

/**
 * Clipboard helpers (browser-only). Throw on failure.
 */
export const writeClipboard = async (text: string): Promise<void> => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
        throw new Error("Clipboard API not available")
    }
    await navigator.clipboard.writeText(text ?? "")
}

export const readClipboard = async (): Promise<string> => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
        throw new Error("Clipboard API not available")
    }
    return await navigator.clipboard.readText()
}
