import { expect } from "@playwright/test"

import { test } from "./fixtures"

test("server-group hides guest-empty groups from anonymous callers", async ({ adminPage: page, browser }) => {
    const tag = Date.now().toString(36)
    const visibleName = `e2e-visible-${tag}`
    const hiddenName = `e2e-hidden-${tag}`

    // Admin creates one group with no servers (will be guest-empty) and one with a public server.
    // First make sure there's at least one public server visible to guests; if not, this whole
    // scenario boils down to "no group is guest-visible", which the assertion below still covers.
    const serversResp = await page.request.get("/api/v1/server")
    expect(serversResp.ok()).toBeTruthy()
    const serversBody = (await serversResp.json()) as { data: Array<{ id: number; hide_for_guest?: boolean }> }
    const publicServer = serversBody.data?.find((s) => !s.hide_for_guest)

    const createdGroupIDs: number[] = []
    if (publicServer) {
        const visibleResp = await page.request.post("/api/v1/server-group", {
            data: { name: visibleName, servers: [publicServer.id] },
        })
        expect(visibleResp.ok()).toBeTruthy()
        createdGroupIDs.push(((await visibleResp.json()) as { data: number }).data)
    }
    const hiddenResp = await page.request.post("/api/v1/server-group", {
        data: { name: hiddenName, servers: [] },
    })
    expect(hiddenResp.ok()).toBeTruthy()
    createdGroupIDs.push(((await hiddenResp.json()) as { data: number }).data)

    try {
        const guestCtx = await browser.newContext()
        try {
            const guestResp = await guestCtx.request.get("/api/v1/server-group")
            expect(guestResp.ok()).toBeTruthy()
            const guestBody = (await guestResp.json()) as {
                data: Array<{ group: { name: string }; servers: number[] }>
            }
            const names = (guestBody.data || []).map((it) => it.group.name)
            expect(names, "guest must NOT see groups with zero visible servers").not.toContain(hiddenName)
            if (publicServer) {
                expect(names, "guest still sees groups that contain a guest-visible server").toContain(visibleName)
            }
        } finally {
            await guestCtx.close()
        }
    } finally {
        if (createdGroupIDs.length > 0) {
            await page.request.post("/api/v1/batch-delete/server-group", { data: createdGroupIDs })
        }
    }
})
