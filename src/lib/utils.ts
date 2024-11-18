import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { z } from "zod"

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
    return str.split(',');
  },
  recordToArr: <T>(rec: Record<string, T>) => {
    const arr: T[] = [];
    for (const val of Object.values(rec)) {
      arr.push(val);
    }
    return arr;
  },
}

export const sleep = (ms: number) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};
