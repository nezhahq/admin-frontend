import { controlSequenceForInput, terminalKeySequence } from "@/lib/terminal-keys"
import { expect, test } from "vitest"

test("terminal mobile keys use xterm-compatible control sequences", () => {
    expect(terminalKeySequence("escape")).toBe("\x1b")
    expect(terminalKeySequence("tab")).toBe("\t")
    expect(terminalKeySequence("arrowUp")).toBe("\x1b[A")
    expect(terminalKeySequence("arrowLeft", true)).toBe("\x1b[1;5D")
    expect(terminalKeySequence("pageDown", true)).toBe("\x1b[6;5~")
})

test("one-shot Ctrl converts printable input without corrupting paste chunks", () => {
    expect(controlSequenceForInput("c")).toBe("\x03")
    expect(controlSequenceForInput("D")).toBe("\x04")
    expect(controlSequenceForInput("[")).toBe("\x1b")
    expect(controlSequenceForInput("codex")).toBeNull()
    expect(controlSequenceForInput("中文")).toBeNull()
})
