import { Page, expect } from "@playwright/test"
import { createHash, randomBytes } from "node:crypto"
import {
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    statSync,
    unlinkSync,
    writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"

import { test } from "./fixtures"

// These tests drive the file manager through the browser against the real
// dashboard and the real Agent started next to it. The Agent runs on the same
// machine as the test, so files it serves are prepared on disk here and files
// it receives are read back from disk.
//
// The transfer protocol has no frame header for file content: a download is one
// "NZTD + total size" frame followed by raw chunks of up to 1 MiB, an error is
// "NERR + text", a listing is "NZFN + path + entries". Every size below sits on
// a boundary of that scheme.

const chunkBytes = 1024 * 1024
const errorMarker = Buffer.from("NERR")

let fixtureRoot = ""
// Each test gets its own directory on the Agent: the listing is virtualized, so
// a row is only in the page while the directory is short enough to show it.
let agentDirectory = ""
let uploadSourceDirectory = ""

function sha256(content: Buffer) {
    return createHash("sha256").update(content).digest("hex")
}

function serveFromAgent(name: string, content: Buffer) {
    writeFileSync(path.join(agentDirectory, name), content)
    return content
}

test.beforeAll(() => {
    fixtureRoot = mkdtempSync(path.join(tmpdir(), "nezha-e2e-file-transfer-"))
    uploadSourceDirectory = path.join(fixtureRoot, "upload source")
    mkdirSync(uploadSourceDirectory)
})

test.beforeEach(() => {
    agentDirectory = mkdtempSync(path.join(fixtureRoot, "agent-files-"))
    mkdirSync(path.join(agentDirectory, "nested directory"))
    writeFileSync(
        path.join(agentDirectory, "nested directory", "inside.txt"),
        "inside the nested directory",
    )
})

test.afterAll(() => {
    rmSync(fixtureRoot, { recursive: true, force: true })
})

async function openFileManager(page: Page) {
    const agentUUID = process.env.E2E_AGENT_UUID
    expect(agentUUID, "E2E_AGENT_UUID must identify the Agent started for the tests").toBeTruthy()
    let serverID = 0
    await expect
        .poll(
            async () => {
                const response = await page.request.get("/api/v1/server")
                if (!response.ok()) return 0
                const body = (await response.json()) as { data?: { id: number; uuid: string }[] }
                serverID = body.data?.find((server) => server.uuid === agentUUID)?.id ?? 0
                return serverID
            },
            { message: "the real Agent must be registered", timeout: 30_000 },
        )
        .toBeGreaterThan(0)

    await page.goto("/dashboard/terminal/" + serverID)
    await page.locator("button:has(svg.lucide-folder-closed)").click()
    await expect(page.getByText("Pseudo File Manager")).toBeVisible()
}

async function goToDirectory(page: Page, directory: string) {
    await page.locator("button:has(svg.lucide-menu)").click()
    await page.getByRole("menuitem", { name: "Go to" }).click()
    await page.getByPlaceholder("Path").fill(directory)
    await page.getByRole("button", { name: "Confirm" }).click()
}

function fileRow(page: Page, name: string) {
    return page.getByRole("row").filter({ has: page.getByText(name, { exact: true }) })
}

async function refreshListing(page: Page) {
    await page.locator("button:has(svg.lucide-menu)").click()
    await page.getByRole("menuitem", { name: "Refresh" }).click()
}

async function download(page: Page, name: string) {
    const started = page.waitForEvent("download", { timeout: 60_000 })
    await fileRow(page, name).locator("button:has(svg.lucide-download)").click()
    const finished = await started
    expect(finished.suggestedFilename()).toBe(name)
    const savedPath = await finished.path()
    await expect(page.getByText("Downloading...")).toBeHidden()
    return readFileSync(savedPath)
}

async function expectDownloadMatches(page: Page, name: string, expected: Buffer) {
    const received = await download(page, name)
    expect(received.byteLength, name + ": size").toBe(expected.byteLength)
    expect(sha256(received), name + ": content").toBe(sha256(expected))
}

async function upload(page: Page, name: string, content: Buffer) {
    const source = path.join(uploadSourceDirectory, name)
    writeFileSync(source, content)
    await page.locator('input[type="file"]').setInputFiles(source)
    // The Agent answers with a completion frame once it has written every
    // byte; the dialog closes on that frame and the listing is refreshed.
    await expect(page.getByText("Uploading...")).toBeHidden({ timeout: 60_000 })
}

function expectStoredByAgent(directory: string, name: string, expected: Buffer) {
    const stored = readFileSync(path.join(directory, name))
    expect(stored.byteLength, name + ": size on the Agent").toBe(expected.byteLength)
    expect(sha256(stored), name + ": content on the Agent").toBe(sha256(expected))
}

// The frontend negotiates a protocol with typed frames when the Agent supports
// it and falls back to the old unframed one otherwise. Every case runs in both:
// "legacy" uses the frontend's override so the old path stays covered while the
// Agent under test is a current one.
const fileManagerProtocols = ["framed", "legacy"] as const

for (const protocol of fileManagerProtocols) {
    test.describe(
        "file manager transfers through the real Agent (" + protocol + " protocol)",
        () => {
            test.beforeEach(async ({ adminPage: page }) => {
                if (protocol === "legacy") {
                    await page.addInitScript(() => {
                        window.localStorage.setItem("nezha-fm-legacy-protocol", "1")
                    })
                }
            })

            // The listing only renders the rows that fit on screen; a tall viewport keeps
            // every fixture of a test in the page.
            test.use({ viewport: { width: 1280, height: 2000 } })

            test("lists a directory, enters a subdirectory and returns", async ({
                adminPage: page,
            }) => {
                serveFromAgent("listed.txt", Buffer.from("listed"))
                serveFromAgent("名称 with spaces é.txt", Buffer.from("unicode name"))
                await openFileManager(page)
                await goToDirectory(page, agentDirectory)

                await expect(fileRow(page, "listed.txt")).toBeVisible()
                await expect(fileRow(page, "名称 with spaces é.txt")).toBeVisible()
                // Only files can be downloaded.
                await expect(
                    fileRow(page, "listed.txt").locator("button:has(svg.lucide-download)"),
                ).toHaveCount(1)
                await expect(
                    fileRow(page, "nested directory").locator("button:has(svg.lucide-download)"),
                ).toHaveCount(0)

                await fileRow(page, "nested directory").click()
                await expect(fileRow(page, "inside.txt")).toBeVisible()
                await expect(fileRow(page, "listed.txt")).toHaveCount(0)

                await goToDirectory(page, agentDirectory)
                await expect(fileRow(page, "listed.txt")).toBeVisible()
                await expect(fileRow(page, "inside.txt")).toHaveCount(0)
            })

            test("downloads arrive byte for byte at every chunk boundary", async ({
                adminPage: page,
            }) => {
                const files: [string, Buffer][] = [
                    ["one-byte.bin", serveFromAgent("one-byte.bin", Buffer.from([0x7f]))],
                    ["small.txt", serveFromAgent("small.txt", Buffer.from("a small text file\n"))],
                    [
                        "one-chunk-minus-one.bin",
                        serveFromAgent("one-chunk-minus-one.bin", randomBytes(chunkBytes - 1)),
                    ],
                    [
                        "exactly-one-chunk.bin",
                        serveFromAgent("exactly-one-chunk.bin", randomBytes(chunkBytes)),
                    ],
                    // The last chunk is shorter than the 4-byte frame marker.
                    [
                        "one-chunk-plus-two.bin",
                        serveFromAgent("one-chunk-plus-two.bin", randomBytes(chunkBytes + 2)),
                    ],
                    [
                        "exactly-three-chunks.bin",
                        serveFromAgent("exactly-three-chunks.bin", randomBytes(3 * chunkBytes)),
                    ],
                    [
                        "three-chunks-plus-seven.bin",
                        serveFromAgent(
                            "three-chunks-plus-seven.bin",
                            randomBytes(3 * chunkBytes + 7),
                        ),
                    ],
                    [
                        "名称 with spaces é.bin",
                        serveFromAgent("名称 with spaces é.bin", randomBytes(4096)),
                    ],
                ]
                await openFileManager(page)
                await goToDirectory(page, agentDirectory)

                // All on one connection, one after another: each download has to leave
                // the connection ready for the next.
                for (const [name, content] of files) {
                    await expect(fileRow(page, name)).toBeVisible()
                    await expectDownloadMatches(page, name, content)
                }
            })

            test("file content that looks like a protocol frame is still file content", async ({
                adminPage: page,
            }) => {
                // Every chunk of this file starts with the error marker: the first full
                // chunk, the second full chunk and the 5-byte tail.
                const everyChunkStartsWithErrorMarker = randomBytes(2 * chunkBytes + 5)
                errorMarker.copy(everyChunkStartsWithErrorMarker, 0)
                errorMarker.copy(everyChunkStartsWithErrorMarker, chunkBytes)
                errorMarker.copy(everyChunkStartsWithErrorMarker, 2 * chunkBytes)
                const files: [string, Buffer][] = [
                    [
                        "every-chunk-starts-with-NERR.bin",
                        serveFromAgent(
                            "every-chunk-starts-with-NERR.bin",
                            everyChunkStartsWithErrorMarker,
                        ),
                    ],
                    [
                        "short-text-starting-with-NERR.txt",
                        serveFromAgent(
                            "short-text-starting-with-NERR.txt",
                            Buffer.from("NERR is how this ordinary text file begins"),
                        ),
                    ],
                    [
                        "only-the-marker.bin",
                        serveFromAgent("only-the-marker.bin", Buffer.from("NERR")),
                    ],
                    // Markers of the other frame types, as the whole file and after a chunk boundary.
                    [
                        "starts-with-NZTD.bin",
                        serveFromAgent(
                            "starts-with-NZTD.bin",
                            Buffer.concat([Buffer.from("NZTD"), randomBytes(64)]),
                        ),
                    ],
                    [
                        "starts-with-NZFN.bin",
                        serveFromAgent(
                            "starts-with-NZFN.bin",
                            Buffer.concat([
                                Buffer.from("NZFN"),
                                randomBytes(chunkBytes - 4),
                                // Exactly at the start of the second chunk.
                                Buffer.from("NZFN"),
                                randomBytes(9),
                            ]),
                        ),
                    ],
                    [
                        "starts-with-NZUP.bin",
                        serveFromAgent(
                            "starts-with-NZUP.bin",
                            Buffer.concat([
                                Buffer.from("NZUP"),
                                randomBytes(chunkBytes - 4),
                                Buffer.from("NZUP"),
                            ]),
                        ),
                    ],
                ]
                await openFileManager(page)
                await goToDirectory(page, agentDirectory)

                for (const [name, content] of files) {
                    await expect(fileRow(page, name)).toBeVisible()
                    await expectDownloadMatches(page, name, content)
                }
                await expect(page.getByText("FM Error")).toHaveCount(0)

                // The connection still speaks the protocol afterwards.
                await fileRow(page, "nested directory").click()
                await expect(fileRow(page, "inside.txt")).toBeVisible()
            })

            test("downloading the same name again returns the current content, shorter or longer", async ({
                adminPage: page,
            }) => {
                const longer = serveFromAgent("rewritten.bin", randomBytes(2 * chunkBytes + 3))
                await openFileManager(page)
                await goToDirectory(page, agentDirectory)
                await expectDownloadMatches(page, "rewritten.bin", longer)

                // The browser keeps a temporary file per name; a shorter file must not
                // come back with the tail of the previous download.
                const shorter = serveFromAgent("rewritten.bin", randomBytes(1000))
                await expectDownloadMatches(page, "rewritten.bin", shorter)

                const longest = serveFromAgent("rewritten.bin", randomBytes(3 * chunkBytes + 1))
                await expectDownloadMatches(page, "rewritten.bin", longest)
            })

            test("an Agent error ends the download and the connection keeps working", async ({
                adminPage: page,
            }) => {
                serveFromAgent("removed-after-listing.bin", randomBytes(2048))
                const survivor = serveFromAgent("still-here.bin", randomBytes(chunkBytes + 11))
                serveFromAgent("empty.bin", Buffer.alloc(0))
                await openFileManager(page)
                await goToDirectory(page, agentDirectory)
                await expect(fileRow(page, "removed-after-listing.bin")).toBeVisible()

                unlinkSync(path.join(agentDirectory, "removed-after-listing.bin"))
                await fileRow(page, "removed-after-listing.bin")
                    .locator("button:has(svg.lucide-download)")
                    .click()

                await expect(page.getByText("FM Error").first()).toBeVisible()
                await expect(page.getByText("Downloading...")).toBeHidden()

                if (protocol === "legacy") {
                    // Without an end frame an empty file cannot be told from a stalled
                    // one, so the Agent refuses it with an error frame.
                    await fileRow(page, "empty.bin")
                        .locator("button:has(svg.lucide-download)")
                        .click()
                    await expect(page.getByText("FM Error")).toHaveCount(2)
                    await expect(page.getByText("Downloading...")).toBeHidden()
                } else {
                    // The framed protocol announces the end, so an empty file downloads.
                    await expectDownloadMatches(page, "empty.bin", Buffer.alloc(0))
                }

                // Nothing of the failed transfer may leak into what follows.
                await expectDownloadMatches(page, "still-here.bin", survivor)
                await refreshListing(page)
                await expect(fileRow(page, "removed-after-listing.bin")).toHaveCount(0)
                await expect(fileRow(page, "still-here.bin")).toBeVisible()
            })

            test("uploads are stored byte for byte at every chunk boundary", async ({
                adminPage: page,
            }) => {
                const uploadTarget = path.join(agentDirectory, "upload target")
                mkdirSync(uploadTarget)
                const everyChunkStartsWithErrorMarker = randomBytes(2 * chunkBytes + 5)
                errorMarker.copy(everyChunkStartsWithErrorMarker, 0)
                errorMarker.copy(everyChunkStartsWithErrorMarker, chunkBytes)
                errorMarker.copy(everyChunkStartsWithErrorMarker, 2 * chunkBytes)
                const files: [string, Buffer][] = [
                    ["uploaded-one-byte.bin", Buffer.from([0x01])],
                    ["uploaded-small.txt", Buffer.from("uploaded text\n")],
                    ["uploaded-exactly-one-chunk.bin", randomBytes(chunkBytes)],
                    ["uploaded-one-chunk-plus-two.bin", randomBytes(chunkBytes + 2)],
                    ["uploaded-three-chunks-plus-seven.bin", randomBytes(3 * chunkBytes + 7)],
                    ["uploaded-every-chunk-starts-with-NERR.bin", everyChunkStartsWithErrorMarker],
                    ["上传 with spaces é.bin", randomBytes(4096)],
                ]
                await openFileManager(page)
                await goToDirectory(page, uploadTarget)

                for (const [name, content] of files) {
                    await upload(page, name, content)
                    await expect(
                        fileRow(page, name),
                        name + " must appear in the listing",
                    ).toBeVisible()
                    expectStoredByAgent(uploadTarget, name, content)
                }
                await expect(page.getByText("FM Error")).toHaveCount(0)
            })

            test("an upload the Agent cannot store fails cleanly and the connection keeps working", async ({
                adminPage: page,
            }) => {
                // A directory with the upload's name makes the Agent fail to create the file.
                const blockedName = "taken-by-a-directory"
                mkdirSync(path.join(agentDirectory, blockedName))
                await openFileManager(page)
                await goToDirectory(page, agentDirectory)
                await expect(fileRow(page, blockedName)).toBeVisible()

                // Upload content has no frame header. If the Agent stopped reading after
                // the failure, this content would reach its command loop and read as
                // "list the nested directory", and the listing below would change.
                const contentReadingAsListCommand = Buffer.concat([
                    Buffer.from([0x00]),
                    Buffer.from(path.join(agentDirectory, "nested directory")),
                ])
                await upload(page, blockedName, contentReadingAsListCommand)

                await expect(page.getByText("FM Error").first()).toBeVisible()
                expect(statSync(path.join(agentDirectory, blockedName)).isDirectory()).toBe(true)
                await expect(fileRow(page, blockedName)).toBeVisible()
                await expect(fileRow(page, "inside.txt")).toHaveCount(0)

                // The same connection accepts the next upload and stores it intact.
                const next = randomBytes(chunkBytes + 3)
                await upload(page, "after-the-failure.bin", next)
                await expect(fileRow(page, "after-the-failure.bin")).toBeVisible()
                expectStoredByAgent(agentDirectory, "after-the-failure.bin", next)
                await expect(fileRow(page, "inside.txt")).toHaveCount(0)
            })

            test("a directory listing larger than one relay frame is shown", async ({
                adminPage: page,
            }) => {
                test.skip(
                    protocol === "legacy",
                    "the old protocol puts the whole listing into one frame; the dashboard splits it above 1 MiB",
                )
                // About 1.4 MiB of names: the dashboard relays at most 1 MiB per frame.
                const crowded = path.join(agentDirectory, "crowded")
                mkdirSync(crowded)
                const filler = "n".repeat(190)
                for (let index = 0; index < 7000; index++) {
                    writeFileSync(path.join(crowded, filler + String(index).padStart(5, "0")), "")
                }
                const content = serveFromAgent(
                    path.join("crowded", "000-first.bin"),
                    randomBytes(2048),
                )
                await openFileManager(page)
                await goToDirectory(page, crowded)

                await expect(fileRow(page, "000-first.bin")).toBeVisible({ timeout: 30_000 })
                await expect(fileRow(page, filler + "00000")).toBeVisible()
                await expect(page.getByText("FM Error")).toHaveCount(0)
                // The connection still transfers files after the paged listing.
                await expectDownloadMatches(page, "000-first.bin", content)
            })

            test("an upload replaces an existing file completely and can be downloaded back", async ({
                adminPage: page,
            }) => {
                const roundTripDirectory = path.join(agentDirectory, "round trip")
                mkdirSync(roundTripDirectory)
                writeFileSync(
                    path.join(roundTripDirectory, "replaced.bin"),
                    randomBytes(2 * chunkBytes),
                )
                await openFileManager(page)
                await goToDirectory(page, roundTripDirectory)
                await expect(fileRow(page, "replaced.bin")).toBeVisible()

                const replacement = randomBytes(chunkBytes + 513)
                await upload(page, "replaced.bin", replacement)
                expect(statSync(path.join(roundTripDirectory, "replaced.bin")).size).toBe(
                    replacement.byteLength,
                )
                expectStoredByAgent(roundTripDirectory, "replaced.bin", replacement)

                // Upload and download share the connection: what went up comes back.
                await expectDownloadMatches(page, "replaced.bin", replacement)
            })
        },
    )
}
