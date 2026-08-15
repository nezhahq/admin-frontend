import { expect } from "@playwright/test"

import { csrfRequest, test } from "./fixtures"

test("file manager creation only accepts POST and reaches the connected Agent", async ({
    adminPage: page,
}) => {
    const getResp = await page.request.get("/api/v1/file?id=1", {
        failOnStatusCode: false,
    })
    expect(
        getResp.status() === 404 || getResp.status() === 405,
        `GET /api/v1/file must no longer be routable (got ${getResp.status()})`,
    ).toBeTruthy()

    const postResp = await csrfRequest(page, "post", "/api/v1/file?id=1", {
        failOnStatusCode: false,
    })
    expect(postResp.status()).toBe(200)
    const body = (await postResp.json()) as {
        data?: { session_id?: string }
        success?: boolean
    }
    expect(body.success, "POST must create a file-manager session through the real Agent").toBe(
        true,
    )
    expect(body.data?.session_id).toBeTruthy()
})
