import { streamChat, type ChatMessage } from "@/api/llm"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@/hooks/useAuth"
import useSetting from "@/hooks/useSetting"
import { Bot, Loader2, MessageCircle, Send, Square, Trash2, X } from "lucide-react"
import {
    type FormEvent,
    type KeyboardEvent,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import { toast } from "sonner"

const STORAGE_OPEN = "llm_widget_open"
const STORAGE_MESSAGES = "llm_widget_messages"

interface PersistedMessage extends ChatMessage {
    id: string
}

function genId(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

function loadMessages(): PersistedMessage[] {
    try {
        const raw = localStorage.getItem(STORAGE_MESSAGES)
        if (!raw) return []
        const parsed = JSON.parse(raw)
        if (!Array.isArray(parsed)) return []
        // 简单校验：丢弃字段不匹配的项
        return parsed.filter(
            (m): m is PersistedMessage =>
                m && typeof m.content === "string" && typeof m.role === "string",
        )
    } catch {
        return []
    }
}

function saveMessages(msgs: PersistedMessage[]): void {
    try {
        localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(msgs.slice(-100)))
    } catch {
        /* localStorage 容量满或被禁用，忽略 */
    }
}

export default function LLMChatWidget() {
    const { t } = useTranslation()
    const { profile } = useAuth()
    const { data: setting } = useSetting()
    const navigate = useNavigate()

    const isAdmin = profile?.role === 0
    const llmEnabled = !!setting?.config?.enable_llm

    const [open, setOpen] = useState<boolean>(() => {
        try {
            return localStorage.getItem(STORAGE_OPEN) === "1"
        } catch {
            return false
        }
    })
    const [messages, setMessages] = useState<PersistedMessage[]>(loadMessages)
    const [input, setInput] = useState("")
    const [streaming, setStreaming] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const abortRef = useRef<AbortController | null>(null)
    const scrollRef = useRef<HTMLDivElement | null>(null)

    // 持久化 open / messages
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_OPEN, open ? "1" : "0")
        } catch {
            /* noop */
        }
    }, [open])

    useEffect(() => {
        saveMessages(messages)
    }, [messages])

    // 消息更新后滚到底
    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        // requestAnimationFrame 让 React 完成渲染后再滚，否则拿到的 clientHeight 偏小。
        requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight
        })
    }, [messages, open])

    const cleanupStream = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort()
            abortRef.current = null
        }
        setStreaming(false)
    }, [])

    // 卸载时取消挂起的流
    useEffect(() => {
        return () => cleanupStream()
    }, [cleanupStream])

    const send = useCallback(async () => {
        const text = input.trim()
        if (text === "" || streaming) return

        if (!isAdmin) {
            toast(t("ChatWidget.ErrorConfig"), { description: t("Error") })
            return
        }
        if (!llmEnabled) {
            toast(t("ChatWidget.ErrorConfig"))
            return
        }

        const userMsg: PersistedMessage = { id: genId(), role: "user", content: text }
        const assistantMsg: PersistedMessage = {
            id: genId(),
            role: "assistant",
            content: "",
        }
        setMessages((prev) => [...prev, userMsg, assistantMsg])
        setInput("")
        setErrorMsg(null)
        setStreaming(true)

        // 流式更新：每收到 delta 就 append 到最后一条 assistant 消息。
        const history: ChatMessage[] = [...messages, { role: "user" as const, content: text }].map(
            (m) => ({ role: m.role, content: m.content }),
        )

        const ctrl = new AbortController()
        abortRef.current = ctrl

        try {
            await streamChat(
                { messages: history },
                {
                    onChunk: (delta) => {
                        setMessages((prev) => {
                            if (prev.length === 0) return prev
                            const last = prev[prev.length - 1]
                            if (last.role !== "assistant") return prev
                            const updated = { ...last, content: last.content + delta }
                            return [...prev.slice(0, -1), updated]
                        })
                    },
                    onThinking: () => {
                        // 后端 agent 在执行 tool 或生成中，可选 UI 提示。
                        // 当前实现只在前端维持"等待"状态，无需特殊处理。
                    },
                    onError: (msg) => {
                        setErrorMsg(msg)
                    },
                    onDone: () => {
                        // 正常结束
                    },
                },
                ctrl.signal,
            )
        } catch (e: any) {
            if (e?.name !== "AbortError") {
                setErrorMsg(e?.message ?? String(e))
            }
        } finally {
            setStreaming(false)
            abortRef.current = null
        }
    }, [input, streaming, isAdmin, llmEnabled, messages, t])

    const stop = useCallback(() => {
        cleanupStream()
    }, [cleanupStream])

    const clear = useCallback(() => {
        if (streaming) stop()
        setMessages([])
        setErrorMsg(null)
        try {
            localStorage.removeItem(STORAGE_MESSAGES)
        } catch {
            /* noop */
        }
    }, [streaming, stop])

    const onFormSubmit = (e: FormEvent) => {
        e.preventDefault()
        void send()
    }

    const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            void send()
        }
    }

    // 非管理员或用户未启用 LLM：不渲染悬浮窗（避免泄露存在性）。
    if (!isAdmin || !llmEnabled) return null

    return (
        <>
            {/* 折叠态：右下角浮动按钮 */}
            {!open && (
                <Button
                    type="button"
                    size="icon"
                    onClick={() => setOpen(true)}
                    aria-label={t("ChatWidget.Open")}
                    className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
                >
                    <MessageCircle className="h-6 w-6" />
                </Button>
            )}

            {/* 展开态：右下角浮窗 */}
            {open && (
                <div
                    className={
                        "fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-2xl " +
                        // 移动端占满宽度，桌面 ~400×540
                        "w-[calc(100vw-2rem)] max-w-[min(420px,calc(100vw-2rem))] " +
                        "h-[min(600px,calc(100vh-4rem))] sm:w-[400px] sm:h-[540px]"
                    }
                    role="dialog"
                    aria-label={t("ChatWidget.Title")}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/40">
                        <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            <span className="text-sm font-medium">
                                {t("ChatWidget.Title")}
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                                · {setting?.config?.llm_model}
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={clear}
                                aria-label="clear"
                                className="h-7 w-7"
                                disabled={streaming || messages.length === 0}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                    cleanupStream()
                                    setOpen(false)
                                }}
                                aria-label="close"
                                className="h-7 w-7"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages */}
                    <ScrollArea className="flex-1 px-3 py-2" ref={scrollRef as any}>
                        <div className="flex flex-col gap-2">
                            {messages.length === 0 && (
                                <div className="py-8 text-center text-sm text-muted-foreground">
                                    {t("ChatWidget.Empty")}
                                </div>
                            )}
                            {messages.map((m) => (
                                <MessageBubble key={m.id} msg={m} streaming={streaming} />
                            ))}
                            {errorMsg && (
                                <div className="mx-1 rounded border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                    {t("ChatWidget.ErrorNetwork", { error: errorMsg })}
                                </div>
                            )}
                            {streaming && messages[messages.length - 1]?.content === "" && (
                                <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    {t("Loading")}
                                </div>
                            )}
                        </div>
                    </ScrollArea>

                    {/* Input */}
                    <form
                        onSubmit={onFormSubmit}
                        className="flex items-end gap-2 border-t bg-background px-3 py-2"
                    >
                        <textarea
                            className={
                                "min-h-[40px] max-h-32 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm " +
                                "ring-offset-background placeholder:text-muted-foreground " +
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            }
                            placeholder={t("ChatWidget.Placeholder")}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={onKeyDown}
                            disabled={streaming}
                            rows={1}
                        />
                        {streaming ? (
                            <Button
                                type="button"
                                size="icon"
                                onClick={stop}
                                aria-label={t("ChatWidget.Stop")}
                                variant="destructive"
                            >
                                <Square className="h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                type="submit"
                                size="icon"
                                aria-label={t("ChatWidget.Send")}
                                disabled={input.trim() === ""}
                            >
                                <Send className="h-4 w-4" />
                            </Button>
                        )}
                    </form>

                    {/* 未配置 Model 时给一个去设置页的提示 */}
                    {!setting?.config?.llm_model && (
                        <div className="border-t bg-muted/40 px-3 py-2 text-xs">
                            <button
                                type="button"
                                className="text-primary underline-offset-2 hover:underline"
                                onClick={() => navigate("/dashboard/settings")}
                            >
                                {t("ChatWidget.ErrorConfig")}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

function MessageBubble({
    msg,
    streaming,
}: {
    msg: PersistedMessage
    streaming: boolean
}) {
    const isUser = msg.role === "user"
    return (
        <div className={"flex " + (isUser ? "justify-end" : "justify-start")}>
            <div
                className={
                    "max-w-[85%] break-words rounded-lg px-3 py-2 text-sm " +
                    (isUser
                        ? "whitespace-pre-wrap bg-primary text-primary-foreground"
                        : "bg-muted text-foreground")
                }
            >
                {isUser ? (
                    // 用户消息保持纯文本：不需要 markdown，更不会渲染用户注入的 HTML。
                    msg.content
                ) : (
                    // Assistant 消息走 markdown；rehype-sanitize 在白名单内
                    // 保留表格 / 列表 / 代码块 / 链接，去掉 <script>/onerror 等危险标签。
                    <MarkdownBubble content={msg.content} streaming={streaming} />
                )}
            </div>
        </div>
    )
}

// MarkdownBubble 渲染 assistant 的 markdown 消息。
//
// 安全：
//   - rehype-sanitize 默认 schema 只放行安全标签 + 属性，能挡住 <script>、
//     <iframe>、onerror 等 XSS 载体；
//   - 用户消息不走这个组件，避免被刻意构造的 markdown / HTML 注入；
//   - 链接强制 target=_blank + rel=noopener noreferrer。
//
// 样式：
//   - 用 Tailwind 手写 prose-*，避免引入额外的 typography 插件；
//   - 暗色模式（`dark:`）由前景/背景色覆盖。
function MarkdownBubble({
    content,
    streaming,
}: {
    content: string
    streaming: boolean
}) {
    // ReactMarkdown 组件映射：用 Tailwind 直接定义各级元素的样式。
    const components = useMemo(
        () => ({
            h1: ({ children }: any) => (
                <h1 className="mb-1 mt-2 text-base font-semibold">{children}</h1>
            ),
            h2: ({ children }: any) => (
                <h2 className="mb-1 mt-2 text-sm font-semibold">{children}</h2>
            ),
            h3: ({ children }: any) => (
                <h3 className="mb-1 mt-1.5 text-sm font-semibold">{children}</h3>
            ),
            p: ({ children }: any) => (
                <p className="my-1 leading-relaxed">{children}</p>
            ),
            ul: ({ children }: any) => (
                <ul className="my-1 list-disc space-y-0.5 pl-5">{children}</ul>
            ),
            ol: ({ children }: any) => (
                <ol className="my-1 list-decimal space-y-0.5 pl-5">{children}</ol>
            ),
            li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
            strong: ({ children }: any) => (
                <strong className="font-semibold">{children}</strong>
            ),
            em: ({ children }: any) => <em className="italic">{children}</em>,
            a: ({ href, children }: any) => {
                const safe = safeHref(href)
                if (!safe) return <span>{children}</span>
                return (
                    <a
                        href={safe}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline-offset-2 hover:underline"
                    >
                        {children}
                    </a>
                )
            },
            code: ({ inline, children }: any) => {
                // 内联 code 没有 className；块级 code 由 pre > code 渲染。
                if (inline) {
                    return (
                        <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-xs">
                            {children}
                        </code>
                    )
                }
                return (
                    <code className="font-mono text-xs">{children}</code>
                )
            },
            pre: ({ children }: any) => (
                <pre className="my-1.5 overflow-x-auto rounded bg-foreground/10 p-2 font-mono text-xs">
                    {children}
                </pre>
            ),
            blockquote: ({ children }: any) => (
                <blockquote className="my-1 border-l-2 border-foreground/20 pl-2 italic text-foreground/80">
                    {children}
                </blockquote>
            ),
            table: ({ children }: any) => (
                <div className="my-1.5 overflow-x-auto">
                    <table className="w-full border-collapse text-xs">{children}</table>
                </div>
            ),
            thead: ({ children }: any) => (
                <thead className="border-b border-foreground/20">{children}</thead>
            ),
            tbody: ({ children }: any) => <tbody>{children}</tbody>,
            tr: ({ children }: any) => <tr>{children}</tr>,
            th: ({ children }: any) => (
                <th className="px-2 py-1 text-left font-medium">{children}</th>
            ),
            td: ({ children }: any) => (
                <td className="px-2 py-1 align-top">{children}</td>
            ),
            hr: () => <hr className="my-2 border-foreground/20" />,
        }),
        [],
    )

    return (
        <div className="llm-markdown">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeSanitize]}
                components={components}
            >
                {content}
            </ReactMarkdown>
            {streaming && (
                <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-foreground/50 align-middle" />
            )}
        </div>
    )
}

// safeHref 仅放行 http(s) / mailto / 相对路径，挡掉 javascript: / data: 等。
function safeHref(href: string | undefined): string | null {
    if (!href) return null
    const trimmed = href.trim()
    if (trimmed === "") return null
    const lower = trimmed.toLowerCase()
    if (
        lower.startsWith("javascript:") ||
        lower.startsWith("data:") ||
        lower.startsWith("vbscript:")
    ) {
        return null
    }
    if (
        lower.startsWith("http://") ||
        lower.startsWith("https://") ||
        lower.startsWith("mailto:") ||
        lower.startsWith("/") ||
        lower.startsWith("#")
    ) {
        return trimmed
    }
    // 兜底：相对路径协议（ftp:// 等）拒掉，避免误渲染。
    if (lower.includes("://")) return null
    return trimmed
}
