export interface FMEntry {
    type: number
    name: string
}

export enum FMOpcode {
    List,
    Download,
    Upload,
}

export const FMIdentifier = {
    file: new Uint8Array([0x4e, 0x5a, 0x54, 0x44]), // NZTD
    fileName: new Uint8Array([0x4e, 0x5a, 0x46, 0x4e]), // NZFN
    error: new Uint8Array([0x4e, 0x45, 0x52, 0x52]), // NERR
    complete: new Uint8Array([0x4e, 0x5a, 0x55, 0x50]), // NZUP
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
