let receivedLength = 0
let expectedLength = 0
let root: FileSystemDirectoryHandle
let draftHandle: FileSystemFileHandle
let accessHandle: FileSystemSyncAccessHandle | undefined

enum Operation {
    WriteHeader = 1,
    WriteChunks,
    DeleteFiles,
    AbortDownload,
}

// 同步访问句柄对文件是独占锁：失败或中止后不关闭，下一次下载同名文件
// 会在 createSyncAccessHandle 处直接报错。
function closeAccessHandle() {
    try {
        accessHandle?.close()
    } catch {
        // 句柄已关闭
    }
    accessHandle = undefined
}

async function finishDownloadIfComplete(fileName: string) {
    if (!accessHandle || receivedLength !== expectedLength) return
    accessHandle.flush()
    closeAccessHandle()

    const fileBlob = await draftHandle.getFile()
    const blob = new Blob([fileBlob], { type: "application/octet-stream" })

    postMessage({ type: 2, blob: blob, fileName: fileName })
}

onmessage = async function (event) {
    try {
        const { operation, arrayBuffer, fileName } = event.data

        switch (operation) {
            case Operation.WriteHeader: {
                const dataView = new DataView(arrayBuffer)
                expectedLength = Number(dataView.getBigUint64(4, false))
                receivedLength = 0

                // Create a new temporary file
                closeAccessHandle()
                root = await navigator.storage.getDirectory()
                draftHandle = await root.getFileHandle(fileName, { create: true })
                accessHandle = await draftHandle.createSyncAccessHandle()
                // 临时文件按文件名复用，不清空的话上次更大的同名文件会留下尾部数据。
                accessHandle.truncate(0)

                // Inform that file handle is created
                const dataChunk = arrayBuffer.slice(12)
                receivedLength += dataChunk.byteLength
                accessHandle.write(dataChunk, { at: 0 })
                const progress = "got handle"
                postMessage({ type: 1, progress: progress })
                // 空文件或首帧已带完整内容时不会再有分片到达，必须在这里收尾。
                await finishDownloadIfComplete(fileName)
                break
            }
            case Operation.WriteChunks: {
                if (!accessHandle) {
                    throw new Error("accessHandle is undefined")
                }

                accessHandle.write(arrayBuffer, { at: receivedLength })
                receivedLength += arrayBuffer.byteLength
                await finishDownloadIfComplete(fileName)
                break
            }
            case Operation.DeleteFiles: {
                for await (const [name, handle] of root.entries()) {
                    if (handle.kind === "file") {
                        await root.removeEntry(name)
                    } else if (handle.kind === "directory") {
                        await root.removeEntry(name, { recursive: true })
                    }
                }
                break
            }
            case Operation.AbortDownload: {
                closeAccessHandle()
                break
            }
        }
    } catch (error) {
        closeAccessHandle()
        // 任何失败都必须通知主线程（例如 HTTP 部署下 navigator.storage 不存在），
        // 主线程靠这条消息关闭下载弹窗并丢弃剩余分片。
        postMessage({ type: 0, error: error instanceof Error ? error.message : String(error) })
    }
}
