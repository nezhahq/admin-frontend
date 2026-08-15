import { expect } from "@playwright/test"

import { test } from "./fixtures"

type AgentServer = {
    host?: { platform?: string }
    id: number
    last_active?: string
    name: string
    uuid: string
}

test("a real agent reports to the dashboard and is selectable in the server table", async ({
    adminPage: page,
}) => {
    const agentUUID = process.env.E2E_AGENT_UUID
    expect(agentUUID, "E2E_AGENT_UUID must identify the Agent started by CI").toBeTruthy()

    let agentServer: AgentServer | undefined
    await expect
        .poll(
            async () => {
                const response = await page.request.get("/api/v1/server")
                if (!response.ok()) return false

                const body = (await response.json()) as { data?: AgentServer[] }
                agentServer = body.data?.find((server) => server.uuid === agentUUID)
                if (!agentServer?.last_active || !agentServer.host?.platform) return false

                return new Date(agentServer.last_active).getTime() > 0
            },
            {
                message: "the real Agent must register and report live host state",
                timeout: 30_000,
            },
        )
        .toBe(true)

    await page.goto("/dashboard")

    const row = page.getByRole("row").filter({
        has: page.getByText(agentServer!.name, { exact: true }),
    })
    await expect(row).toHaveCount(1)

    const selection = row.getByRole("checkbox", { name: "Select row" })
    await expect(selection).not.toBeChecked()
    await selection.click()
    await expect(selection).toBeChecked()
})
