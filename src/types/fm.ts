export interface FMEntry {
    type: number
    name: string
}

export enum FMOpcode {
    List,
    Download,
    Upload,
    // 协商带帧头的协议：操作码后面跟本端支持的最高版本。
    Hello,
}

// 带帧头的协议的版本号，见 src/components/fm.tsx 里的说明。
export const FMFramedProtocolVersion = 2

export const FMIdentifier = {
    file: new Uint8Array([0x4e, 0x5a, 0x54, 0x44]), // NZTD
    fileName: new Uint8Array([0x4e, 0x5a, 0x46, 0x4e]), // NZFN
    error: new Uint8Array([0x4e, 0x45, 0x52, 0x52]), // NERR
    complete: new Uint8Array([0x4e, 0x5a, 0x55, 0x50]), // NZUP
    // 以下只出现在带帧头的协议里。
    hello: new Uint8Array([0x4e, 0x5a, 0x48, 0x49]), // NZHI
    listingPage: new Uint8Array([0x4e, 0x5a, 0x4c, 0x32]), // NZL2
    downloadChunk: new Uint8Array([0x4e, 0x5a, 0x44, 0x43]), // NZDC
    downloadEnd: new Uint8Array([0x4e, 0x5a, 0x44, 0x45]), // NZDE
}

export interface FMWorkerPost {
    operation: number
    arrayBuffer: ArrayBuffer
    fileName: string
}

export enum FMWorkerOpcode {
    Error,
    Progress,
    Result,
}

export interface FMWorkerData {
    type: FMWorkerOpcode
    error: string
    blob?: Blob
    progress?: string
    fileName?: string
}
