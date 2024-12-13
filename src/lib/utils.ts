import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { z } from "zod"
import { FMEntry, FMOpcode, ModelIP } from "@/types"
import FMWorker from "./fm?worker"
import copy from "copy-to-clipboard"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

const emptyStringToUndefined = z.literal('').transform(() => undefined);

export function asOptionalField<T extends z.ZodTypeAny>(schema: T) {
    return schema.optional().or(emptyStringToUndefined);
}

export const conv = {
    recordToStr: (rec: Record<string, boolean>) => {
        const arr: string[] = [];
        for (const key in rec) {
            arr.push(key);
        }

        return arr.join(',');
    },
    strToRecord: (str: string) => {
        const arr = str.split(',');
        return arr.reduce((acc, num) => {
            acc[num] = true;
            return acc;
        }, {} as Record<string, boolean>);
    },
    arrToStr: <T>(arr: T[]) => {
        return arr.join(',');
    },
    strToArr: (str: string) => {
        return str.split(',').filter(Boolean) || [];
    },
    recordToArr: <T>(rec: Record<string, T>) => {
        const arr: T[] = [];
        for (const val of Object.values(rec)) {
            arr.push(val);
        }
        return arr;
    },
    recordToStrArr: <T>(rec: Record<string, T>) => {
        const arr: string[] = [];
        for (const val of Object.keys(rec)) {
            arr.push(val);
        }
        return arr;
    },
    arrToRecord: (arr: string[]) => {
        const rec: Record<string, boolean> = {};
        for (const val of arr) {
            rec[val] = true;
        }
        return rec;
    }
}

export const sleep = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

export const fm = {
    parseFMList: async (buf: ArrayBufferLike) => {
        const dataView = new DataView(buf);
        let offset = 4; // Identifier: 4 bytes (NZFN), not needed here

        const pathLength = dataView.getUint32(offset);
        offset += 4; // File Path Length: 4 bytes

        const pathBuf = new Uint8Array(buf, offset, pathLength);
        const path = new TextDecoder('utf-8').decode(pathBuf);
        offset += pathLength; // Path: N bytes

        const fmList: FMEntry[] = [];
        while (offset < dataView.byteLength) {
            const fileType = dataView.getUint8(offset);
            offset += 1; // File Type: 1 byte

            const nameLength = dataView.getUint8(offset);
            offset += 1; // File Name Length: 1 byte

            const nameBuf = new Uint8Array(buf, offset, nameLength);
            const name = new TextDecoder('utf-8').decode(nameBuf);
            offset += nameLength; // File Name: N bytes

            fmList.push({
                type: fileType,
                name: name,
            })
        }

        return { path, fmList };
    },

    buildUploadHeader: ({ path, file }: { path: string, file: File }) => {
        const filePath = `${path}/${file.name}`;

        // Build header (opcode + file size + path)
        const filePathBytes = new TextEncoder().encode(filePath);
        const header = new ArrayBuffer(1 + 8 + filePathBytes.length);
        const headerView = new DataView(header);

        headerView.setUint8(0, FMOpcode.Upload);
        headerView.setBigUint64(1, BigInt(file.size), false);

        new Uint8Array(header, 9).set(filePathBytes);
        return header;
    },

    readFileAsArrayBuffer: async (blob: Blob): Promise<string | ArrayBuffer | null> => {
        const reader = new FileReader();

        return new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(blob);
        });
    },
}

export const fmWorker = new FMWorker();

export function formatPath(path: string) {
    return path.replace(/\/{2,}/g, '/');
}

export function joinIP(p?: ModelIP) {
    if (p) {
        if (p.ipv4_addr && p.ipv6_addr) {
            return `${p.ipv4_addr}/${p.ipv6_addr}`;
        } else if (p.ipv4_addr) {
            return p.ipv4_addr;
        }
        return p.ipv6_addr;
    }
    return '';
}

function base64toUint8Array(base64str: string) {
    const binary = atob(base64str);
    const len = binary.length;
    const buf = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        buf[i] = binary.charCodeAt(i);
    }
    return buf;
}

export function ip16Str(base64str: string) {
    const buf = base64toUint8Array(base64str);
    const ip4 = buf.slice(-6);
    if (ip4[0] === 255 && ip4[1] === 255) {
        return ip4.slice(2).join('.');
    }
    return ipv6BinaryToString(buf);
}

const digits = '0123456789abcdef';

function appendHex(b: string[], x: number): void {
  if (x >= 0x1000) {
    b.push(digits[(x >> 12) & 0xf]);
  }
  if (x >= 0x100) {
    b.push(digits[(x >> 8) & 0xf]);
  }
  if (x >= 0x10) {
    b.push(digits[(x >> 4) & 0xf]);
  }
  b.push(digits[x & 0xf]);
}

function ipv6BinaryToString(ip: Uint8Array): string {
  let ipBytes: Uint8Array;

  if (ip.length !== 16) {
    ipBytes = new Uint8Array(16);
    const len = Math.min(ip.length, 16);
    ipBytes.set(ip.subarray(0, len));
  } else {
    ipBytes = ip;
  }

  const hextets: number[] = [];
  for (let i = 0; i < 16; i += 2) {
    hextets.push((ipBytes[i] << 8) | ipBytes[i + 1]);
  }

  let zeroStart = -1;
  let zeroLength = 0;

  for (let i = 0; i <= hextets.length;) {
    let j = i;
    while (j < hextets.length && hextets[j] === 0) {
      j++;
    }
    const length = j - i;
    if (length >= 2 && length > zeroLength) {
      zeroStart = i;
      zeroLength = length;
    }
    if (j === i) {
      i++;
    } else {
      i = j;
    }
  }

  const parts: string[] = [];
  for (let i = 0; i < hextets.length; i++) {
    if (zeroLength > 0 && i === zeroStart) {
      parts.push('');
      i += zeroLength - 1;
      continue;
    }

    if (parts.length > 0) {
      parts.push(':');
    }

    const b: string[] = [];
    appendHex(b, hextets[i]);
    parts.push(b.join(''));
  }

  let ipv6 = parts.join('');

  if (ipv6.startsWith('::')) {

  } else if (ipv6.startsWith(':')) {
    ipv6 = ':' + ipv6;
  }
  if (ipv6.endsWith('::')) {

  } else if (ipv6.endsWith(':')) {
    ipv6 = ipv6 + ':';
  }
  if (ipv6 === '') {
    ipv6 = '::';
  }

    return ipv6;
}

export async function copyToClipboard(text: string) {
    try {
        return await navigator.clipboard.writeText(text);
    } catch (error) {
        console.error('navigator', error);
    }
    try {
        return copy(text)
    } catch (error) {
        console.error('copy', error);
    }
    throw new Error('Failed to copy text to clipboard');
}