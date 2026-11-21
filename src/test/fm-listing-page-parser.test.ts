import { fm } from "@/lib/utils"
import { expect, test } from "vitest"

function listingPage(path: string, entries: [number, string][], isLastPage: boolean) {
    const encoder = new TextEncoder()
    const pathBytes = encoder.encode(path)
    const encodedEntries = entries.map(([type, name]) => [type, encoder.encode(name)] as const)
    const size =
        9 + pathBytes.length + encodedEntries.reduce((sum, [, name]) => sum + 3 + name.length, 0)
    const frame = new Uint8Array(size)
    const view = new DataView(frame.buffer)
    frame.set([0x4e, 0x5a, 0x4c, 0x32], 0)
    view.setUint8(4, isLastPage ? 1 : 0)
    view.setUint32(5, pathBytes.length, false)
    frame.set(pathBytes, 9)
    let offset = 9 + pathBytes.length
    for (const [type, name] of encodedEntries) {
        view.setUint8(offset, type)
        view.setUint16(offset + 1, name.length, false)
        frame.set(name, offset + 3)
        offset += 3 + name.length
    }
    return frame.buffer
}

// The old listing kept a name's length in one byte. A page of the framed
// listing has two, so names above 255 bytes survive and do not shift the
// entries after them.
test("a framed listing page yields its path, entries and whether it is the last", () => {
    const longName = "长".repeat(200) // 600 bytes
    const page = fm.parseFMListPage(
        listingPage(
            "/srv/数据",
            [
                [0, longName],
                [1, "nested"],
                [0, "after.txt"],
            ],
            false,
        ),
    )

    expect(page.path).toBe("/srv/数据")
    expect(page.isLastPage).toBe(false)
    expect(page.entries).toEqual([
        { type: 0, name: longName },
        { type: 1, name: "nested" },
        { type: 0, name: "after.txt" },
    ])
})

test("an empty last page ends a listing", () => {
    const page = fm.parseFMListPage(listingPage("/empty", [], true))

    expect(page).toEqual({ path: "/empty", entries: [], isLastPage: true })
})
