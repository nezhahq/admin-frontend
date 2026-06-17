import { FetcherMethod, csrfHeaders, fetcher } from "./api"

export interface ChatMessage {
    role: "system" | "user" | "assistant"
    content: string
}

export interface ChatRequest {
    messages: ChatMessage[]
}

export interface LLMTestResult {
    ok: boolean
    reply?: string
    model?: string
    base_url?: string
    latency_ms: number
}

// 流式调用 /api/v1/llm/chat（SSE）。
//
// 后端约定：
//   - Content-Type: text/event-stream
//   - 每条事件以 "\n\n" 分隔；行首 "data: " 后跟 JSON：
//       {"delta": "..."}            ← 增量内容
//       {"error": "..."}            ← 流错误（也可能是 event: error）
//       "[DONE]"                    ← 结束
//   - onChunk 每次拿到 delta 字符串时被调用；onError 在流错误时被调用；
//     onDone 在流正常结束时被调用。
export interface StreamChatCallbacks {
    onChunk: (delta: string) => void
    onError?: (message: string) => void
    onDone?: () => void
    /** 模型开始思考 / 执行工具时触发，可用于切换 loading 文案。 */
    onThinking?: () => void
}

export async function streamChat(
    body: ChatRequest,
    cb: StreamChatCallbacks,
    signal?: AbortSignal,
): Promise<void> {
    const res = await fetch("/api/v1/llm/chat", {
        method: FetcherMethod.POST,
        headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
            ...csrfHeaders(FetcherMethod.POST, "/api/v1/llm/chat"),
        },
        body: JSON.stringify(body),
        signal,
    })

    if (!res.ok || !res.body) {
        // 401/403/5xx：尝试从 CommonResponse JSON 提取错误；SSE 错误是 event: error，
        // 由下面的循环处理。这里只处理"还没读到 body 就失败了"的情况。
        let detail = res.statusText || `HTTP ${res.status}`
        try {
            const text = await res.text()
            const parsed = JSON.parse(text)
            if (parsed?.error) detail = parsed.error
            else if (typeof text === "string" && text.length > 0) detail = text
        } catch {
            /* ignore */
        }
        cb.onError?.(detail)
        return
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""

    try {
        while (true) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            // SSE 协议：按 "\n\n" 切 event。
            let idx: number
            while ((idx = buffer.indexOf("\n\n")) !== -1) {
                const rawEvent = buffer.slice(0, idx)
                buffer = buffer.slice(idx + 2)
                processSSEEvent(rawEvent, cb)
            }
        }

        // 流结束：残留 buffer 可能还有最后一段。
        if (buffer.trim() !== "") {
            processSSEEvent(buffer, cb)
            buffer = ""
        }
    } catch (e) {
        // AbortError 表示用户主动停止，不当作错误。
        if ((e as Error)?.name === "AbortError") {
            cb.onDone?.()
            return
        }
        cb.onError?.((e as Error)?.message ?? String(e))
        return
    }

    cb.onDone?.()
}

function processSSEEvent(raw: string, cb: StreamChatCallbacks): void {
    let eventName = "message"
    const dataLines: string[] = []
    for (const line of raw.split("\n")) {
        if (line.startsWith("event:")) {
            eventName = line.slice("event:".length).trim()
        } else if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trim())
        }
    }
    const data = dataLines.join("\n")
    if (data === "") return

    if (data === "[DONE]") {
        cb.onDone?.()
        return
    }

    if (eventName === "error") {
        cb.onError?.(extractErrorMessage(data))
        return
    }

    if (eventName === "thinking") {
        // 标记模型正在思考 / 执行 tool；前端可切换 loading 文案。
        ;(cb as any).onThinking?.()
        return
    }

    try {
        const parsed = JSON.parse(data) as { delta?: string; error?: string }
        if (parsed.error) {
            cb.onError?.(parsed.error)
            return
        }
        if (typeof parsed.delta === "string" && parsed.delta !== "") {
            cb.onChunk(parsed.delta)
        }
    } catch {
        cb.onError?.(`invalid SSE payload: ${data.slice(0, 200)}`)
    }
}

function extractErrorMessage(data: string): string {
    try {
        const parsed = JSON.parse(data) as { error?: string }
        if (parsed.error) return parsed.error
    } catch {
        /* ignore */
    }
    return data
}

// 连通性测试：返回 LLMTestResult（成功）或抛 Error（失败）。
export async function testLLMConnection(): Promise<LLMTestResult> {
    return fetcher<LLMTestResult>(FetcherMethod.POST, "/api/v1/llm/test")
}
