import { createTerminal } from "@/api/terminal"
import { ModelCreateTerminalResponse } from "@/types"
import { useEffect, useState } from "react"

export default function useTerminal(serverId?: number) {
    const [terminal, setTerminal] = useState<ModelCreateTerminalResponse | null>(null)

    useEffect(() => {
        if (!serverId) return
        let cancelled = false
        createTerminal(serverId)
            .then((response) => {
                if (!cancelled) setTerminal(response)
            })
            .catch((error) => {
                console.error("Failed to fetch terminal:", error)
            })
        return () => {
            cancelled = true
        }
    }, [serverId])

    return terminal
}
