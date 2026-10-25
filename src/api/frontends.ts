import { FetcherMethod, fetcher } from "./api"

export interface FrontendTemplate {
    path: string
    name: string
    repository: string
    version: string
    is_admin?: boolean
    is_official?: boolean
    custom?: boolean
}

export interface FrontendStatus {
    templates: FrontendTemplate[]
    user_template: string
    admin_template: string
}

export interface FrontendRelease {
    tag_name: string
    name: string
    prerelease: boolean
    assets: { name: string; size: number }[]
}

export interface FrontendReleasePage {
    releases: FrontendRelease[]
    page: number
    has_more: boolean
}

export const listFrontendReleases = (repository: string, page: number) =>
    fetcher<FrontendReleasePage>(FetcherMethod.GET, "/api/v1/frontend/releases", {
        repository,
        page,
    })

export const installFrontend = (repository: string, tag: string, is_admin: boolean) =>
    fetcher<FrontendTemplate>(FetcherMethod.POST, "/api/v1/frontend/install", {
        repository,
        tag,
        is_admin,
    })

export const activateFrontend = (path: string, is_admin: boolean) =>
    fetcher<void>(FetcherMethod.POST, "/api/v1/frontend/activate", { path, is_admin })
