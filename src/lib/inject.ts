export const InjectContext = (content: string) => {
    const tempDiv = document.createElement("div")
    tempDiv.innerHTML = content

    const INJECTION_MARK = "data-injected" // 自定义属性标识

    // 清理已有的注入资源
    const cleanInjectedResources = () => {
        document.querySelectorAll(`[${INJECTION_MARK}]`).forEach((node) => node.remove())
    }

    const loadExternalScript = (scriptElement: HTMLScriptElement): Promise<void> => {
        return new Promise((resolve, reject) => {
            const script = document.createElement("script")
            script.src = scriptElement.src
            script.async = false // 保持顺序执行
            script.setAttribute(INJECTION_MARK, "true") // 添加标识
            script.onload = () => resolve()
            script.onerror = () => reject(new Error(`Failed to load script: ${scriptElement.src}`))
            document.head.appendChild(script)
        })
    }

    const executeInlineScript = (scriptElement: HTMLScriptElement): void => {
        const script = document.createElement("script")
        script.textContent = scriptElement.textContent
        script.setAttribute(INJECTION_MARK, "true") // 添加标识
        document.body.appendChild(script)
    }

    const loadStyle = (styleElement: HTMLStyleElement): Promise<void> => {
        return new Promise((resolve, reject) => {
            if ((styleElement as any).href) {
                // 处理 <link>
                const link = document.createElement("link")
                link.rel = "stylesheet"
                link.href = (styleElement as any).href
                link.setAttribute(INJECTION_MARK, "true") // 添加标识
                link.onload = () => resolve()
                link.onerror = () => reject(new Error(`Failed to load stylesheet: ${link.href}`))
                document.head.appendChild(link)
            } else {
                const style = document.createElement("style")
                style.textContent = styleElement.textContent
                style.setAttribute(INJECTION_MARK, "true") // 添加标识
                document.head.appendChild(style)
                resolve()
            }
        })
    }

    const handlers: { [key: string]: (element: HTMLElement) => Promise<void> } = {
        SCRIPT: (element) => {
            const scriptElement = element as HTMLScriptElement
            if (scriptElement.src) {
                // 加载外部脚本
                return loadExternalScript(scriptElement)
            } else {
                // 推迟执行内联脚本，后续手动执行
                return Promise.resolve()
            }
        },
        STYLE: (element) => loadStyle(element as HTMLStyleElement),
        META: (element) => {
            const meta = element.cloneNode(true) as HTMLElement
            meta.setAttribute(INJECTION_MARK, "true") // 添加标识
            document.head.appendChild(meta) // 将 meta 标签插入到 <head>
            return Promise.resolve()
        },
        DEFAULT: (element) => {
            element.setAttribute(INJECTION_MARK, "true") // 添加标识
            document.body.appendChild(element)
            return Promise.resolve()
        },
    }

    // 开始注入前清理已有资源
    cleanInjectedResources()

    const externalScriptQueue: Promise<void>[] = []

    Array.from(tempDiv.childNodes).forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as HTMLElement
            if (element.tagName === "SCRIPT" && !(element as HTMLScriptElement).src) {
                // 直接执行内联脚本
                executeInlineScript(element as HTMLScriptElement)
            } else {
                const handler = handlers[element.tagName] || handlers.DEFAULT
                externalScriptQueue.push(handler(element))
            }
        } else if (node.nodeType === Node.TEXT_NODE) {
            document.body.appendChild(document.createTextNode(node.textContent || ""))
        }
    })

    return Promise.all(externalScriptQueue)
        .then(() => {
            console.log("All resources have been injected successfully.")
        })
        .catch((error) => {
            console.error("Error during resource injection:", error)
        })
}
