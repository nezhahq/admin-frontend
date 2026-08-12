export type TerminalKey =
    | "escape"
    | "tab"
    | "arrowUp"
    | "arrowDown"
    | "arrowLeft"
    | "arrowRight"
    | "home"
    | "end"
    | "pageUp"
    | "pageDown"

const keySequences: Record<TerminalKey, string> = {
    escape: "\x1b",
    tab: "\t",
    arrowUp: "\x1b[A",
    arrowDown: "\x1b[B",
    arrowRight: "\x1b[C",
    arrowLeft: "\x1b[D",
    home: "\x1b[H",
    end: "\x1b[F",
    pageUp: "\x1b[5~",
    pageDown: "\x1b[6~",
}

const controlKeySequences: Partial<Record<TerminalKey, string>> = {
    arrowUp: "\x1b[1;5A",
    arrowDown: "\x1b[1;5B",
    arrowRight: "\x1b[1;5C",
    arrowLeft: "\x1b[1;5D",
    home: "\x1b[1;5H",
    end: "\x1b[1;5F",
    pageUp: "\x1b[5;5~",
    pageDown: "\x1b[6;5~",
}

export function terminalKeySequence(key: TerminalKey, control = false): string {
    return (control && controlKeySequences[key]) || keySequences[key]
}

export function controlSequenceForInput(data: string): string | null {
    if (data.length !== 1) return null

    const code = data.toUpperCase().charCodeAt(0)
    if (code >= 65 && code <= 90) return String.fromCharCode(code - 64)

    const punctuation: Record<string, number> = {
        " ": 0,
        "@": 0,
        "[": 27,
        "\\": 28,
        "]": 29,
        "^": 30,
        _: 31,
        "?": 127,
        "2": 0,
        "3": 27,
        "4": 28,
        "5": 29,
        "6": 30,
        "7": 31,
        "8": 127,
    }
    const mapped = punctuation[data]
    return mapped === undefined ? null : String.fromCharCode(mapped)
}
