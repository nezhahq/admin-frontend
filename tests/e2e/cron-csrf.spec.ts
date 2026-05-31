import { expect } from "@playwright/test"

import { csrfHeaders, test } from "./fixtures"

test("manual cron trigger goes through POST, not GET", async ({ adminPage: page }) => {
    const created = await page.request.post("/api/v1/cron", {
        headers: await csrfHeaders(page),
        data: {
            name: "e2e-cron-csrf",
            task_type: 0,
            scheduler: "@every 1h",
            command: "true",
            servers: [],
            cover: 0,
            push_successful: false,
            notification_group_id: 0,
        },
    })
    expect(created.ok(), "create cron via POST must succeed").toBeTruthy()
    const { data: cronID } = (await created.json()) as { data: number }
    expect(typeof cronID).toBe("number")

    try {
        const getResp = await page.request.get(`/api/v1/cron/${cronID}/manual`, {
            failOnStatusCode: false,
        })
        expect(
            getResp.status() === 404 || getResp.status() === 405,
            `GET must no longer be routable (got ${getResp.status()})`,
        ).toBeTruthy()

        const postResp = await page.request.post(`/api/v1/cron/${cronID}/manual`, {
            headers: await csrfHeaders(page),
        })
        expect(postResp.ok(), `POST must succeed (got ${postResp.status()})`).toBeTruthy()
        const body = await postResp.json()
        expect(body.success).toBe(true)
    } finally {
        await page.request.post("/api/v1/batch-delete/cron", {
            headers: await csrfHeaders(page),
            data: [cronID],
        })
    }
})
