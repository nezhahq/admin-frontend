import { createTerminal } from "@/api/terminal"
import { ModelCreateTerminalResponse } from "@/types"
import { useEffect, useState } from "react"

export default function useTerminal(serverId?: number) {
    const [terminal, setTerminal] = useState<ModelCreateTerminalResponse | null>(null)

    async function fetchTerminal() {
        try {
            const response = await createTerminal(serverId!)
            setTerminal(response)
        } catch (error) {
            console.error("Failed to fetch terminal:", error)
        }
    }

    useEffect(() => {
        if (!serverId) return
        fetchTerminal()
    }, [serverId])

    return terminal
}
