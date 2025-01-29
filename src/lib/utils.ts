import { FMEntry, FMOpcode, ModelIP } from "@/types"
import { type ClassValue, clsx } from "clsx"
import copy from "copy-to-clipboard"
import { twMerge } from "tailwind-merge"
import { z } from "zod"

import FMWorker from "./fm?worker"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const emptyStringToUndefined = z.literal("").transform(() => undefined)

export function asOptionalField<T extends z.ZodTypeAny>(schema: T) {
    return schema.optional().or(emptyStringToUndefined)
}

export const conv = {
    recordToStr: <T>(rec: Record<string, T>) => {
        const arr: string[] = []
        for (const key in rec) {
            arr.push(key)
        }

        return arr.join(",")
    },
    strToRecord: (str: string) => {
        const arr = str.split(",")
        return arr.reduce(
            (acc, num) => {
                acc[num] = true
                return acc
            },
            {} as Record<string, boolean>,
        )
    },
    arrToStr: <T>(arr: T[]) => {
        return arr.join(",")
    },
    strToArr: (str: string) => {
        return str.split(",").filter(Boolean) || []
    },
    recordToArr: <T>(rec: Record<string, T>) => {
        const arr: T[] = []
        for (const val of Object.values(rec)) {
            arr.push(val)
        }
        return arr
    },
    recordToStrArr: <T>(rec: Record<string, T>) => {
        const arr: string[] = []
        for (const val of Object.keys(rec)) {
            arr.push(val)
        }
        return arr
    },
    arrToRecord: (arr: string[]) => {
        const rec: Record<string, boolean> = {}
        for (const val of arr) {
            rec[val] = true
        }
        return rec
    },
}

export const sleep = (ms: number) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const fm = {
    parseFMList: async (buf: ArrayBufferLike) => {
        const dataView = new DataView(buf)
        let offset = 4 // Identifier: 4 bytes (NZFN), not needed here

        const pathLength = dataView.getUint32(offset)
        offset += 4 // File Path Length: 4 bytes

        const pathBuf = new Uint8Array(buf, offset, pathLength)
        const path = new TextDecoder("utf-8").decode(pathBuf)
        offset += pathLength // Path: N bytes

        const fmList: FMEntry[] = []
        while (offset < dataView.byteLength) {
            const fileType = dataView.getUint8(offset)
            offset += 1 // File Type: 1 byte

            const nameLength = dataView.getUint8(offset)
            offset += 1 // File Name Length: 1 byte

            const nameBuf = new Uint8Array(buf, offset, nameLength)
            const name = new TextDecoder("utf-8").decode(nameBuf)
            offset += nameLength // File Name: N bytes

            fmList.push({
                type: fileType,
                name: name,
            })
        }

        return { path, fmList }
    },

    buildUploadHeader: ({ path, file }: { path: string; file: File }) => {
        const filePath = `${path}/${file.name}`

        // Build header (opcode + file size + path)
        const filePathBytes = new TextEncoder().encode(filePath)
        const header = new ArrayBuffer(1 + 8 + filePathBytes.length)
        const headerView = new DataView(header)

        headerView.setUint8(0, FMOpcode.Upload)
        headerView.setBigUint64(1, BigInt(file.size), false)

        new Uint8Array(header, 9).set(filePathBytes)
        return header
    },

    readFileAsArrayBuffer: async (blob: Blob): Promise<string | ArrayBuffer | null> => {
        const reader = new FileReader()

        return new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result)
            reader.onerror = () => reject(reader.error)
            reader.readAsArrayBuffer(blob)
        })
    },
}

export const fmWorker = new FMWorker()

export function formatPath(path: string) {
    return path.replace(/\/{2,}/g, "/")
}

export function joinIP(p?: ModelIP) {
    if (p) {
        if (p.ipv4_addr && p.ipv6_addr) {
            return `${p.ipv4_addr}/${p.ipv6_addr}`
        } else if (p.ipv4_addr) {
            return p.ipv4_addr
        }
        return p.ipv6_addr
    }
    return ""
}

export async function copyToClipboard(text: string) {
    try {
        return await navigator.clipboard.writeText(text)
    } catch (error) {
        console.error("navigator", error)
    }
    try {
        return copy(text)
    } catch (error) {
        console.error("copy", error)
    }
    throw new Error("Failed to copy text to clipboard")
}
