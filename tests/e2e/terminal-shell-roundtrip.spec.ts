import { expect } from "@playwright/test"

import { test } from "./fixtures"

// The terminal runs through the real dashboard and the real Agent's PTY: what
// is typed reaches the shell and what the shell prints comes back.
test("terminal input reaches the Agent's shell and its output comes back", async ({
    adminPage: page,
}) => {
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
    const terminalInput = page.locator(".xterm-helper-textarea")
    await expect(terminalInput).toBeAttached({ timeout: 30_000 })
    await terminalInput.focus()

    // The arithmetic keeps the expected text out of the echoed command line.
    await page.keyboard.type("echo terminal-$((40+2))-roundtrip")
    await page.keyboard.press("Enter")

    await expect(page.locator(".xterm")).toContainText("terminal-42-roundtrip", { timeout: 30_000 })
})
