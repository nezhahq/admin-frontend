import { useMainStore } from "@/hooks/useMainStore"
import { ModelProfile } from "@/types"
import { expect, test } from "vitest"

test("the agent secret is kept in memory but never written to localStorage", () => {
    useMainStore.getState().setProfile({
        id: 1,
        username: "admin",
        agent_secret: "agent-secret-value",
    } as ModelProfile)

    expect(useMainStore.getState().profile?.agent_secret).toBe("agent-secret-value")
    const persisted = localStorage.getItem("mainStore") ?? ""
    expect(persisted).toContain("admin")
    expect(persisted).not.toContain("agent-secret-value")
})
