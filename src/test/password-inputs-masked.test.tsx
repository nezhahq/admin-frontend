import { ProfileCard } from "@/components/profile"
import { UserCard } from "@/components/user"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"

vi.mock("react-i18next", () => ({
    useTranslation: () => ({ t: (key: string) => key }),
    initReactI18next: { type: "3rdParty", init: () => undefined },
}))
vi.mock("sonner", () => ({ toast: vi.fn() }))

afterEach(() => {
    cleanup()
})

test("the new user dialog masks the password", () => {
    render(<UserCard mutate={vi.fn()} />)
    fireEvent.click(screen.getByRole("button"))

    expect(screen.getByLabelText("Password").getAttribute("type")).toBe("password")
})

test("the profile dialog masks the current and the new password", () => {
    render(<ProfileCard className="" />)
    fireEvent.click(screen.getByRole("button", { name: "UpdateProfile" }))

    expect(screen.getByLabelText("OriginalPassword").getAttribute("type")).toBe("password")
    expect(screen.getByLabelText("NewPassword").getAttribute("type")).toBe("password")
})
