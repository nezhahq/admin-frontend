import { FetcherMethod, fetcher } from "./api"

export interface MCPOAuthConsentInfo {
    client_name: string
    redirect_uri: string
    resource: string
    scopes: string[]
    servers: { id: number; name: string }[]
    consent_token: string
}

export interface MCPOAuthConsentDecision {
    consent_token: string
    approve: boolean
    scopes: string[]
    server_ids: number[]
    all_servers: boolean
}

export const getMCPOAuthConsent = (search: string) =>
    fetcher<MCPOAuthConsentInfo>(FetcherMethod.GET, `/api/v1/mcp/oauth/consent${search}`)

export const submitMCPOAuthConsent = (decision: MCPOAuthConsentDecision) =>
    fetcher<{ redirect_uri: string }>(FetcherMethod.POST, "/api/v1/mcp/oauth/consent", decision)

export interface MCPOAuthGrantView {
    id: string
    client_id: string
    client_name: string
    user_id: number
    username: string
    scopes: string[]
    server_ids: number[]
    created_at: string
    expires_at: string
    last_used_at?: string
    last_used_ip?: string
    status: "active" | "expired" | "unavailable"
}

export interface MCPOAuthClientView {
    id: string
    name: string
    redirect_uris: string[]
    auth_method: string
    disabled: boolean
    last_used_at: string
    grant_count: number
}

export interface MCPOAuthPage<T> {
    items: T[]
    total: number
}

export const listMCPOAuthGrants = (all: boolean, page: number) =>
    fetcher<MCPOAuthPage<MCPOAuthGrantView>>(FetcherMethod.GET, "/api/v1/mcp/oauth/grants", {
        all,
        page,
        limit: 20,
    })

export const revokeMCPOAuthGrant = (id: string) =>
    fetcher<void>(FetcherMethod.DELETE, `/api/v1/mcp/oauth/grants/${encodeURIComponent(id)}`)

export const listMCPOAuthClients = (page: number) =>
    fetcher<MCPOAuthPage<MCPOAuthClientView>>(FetcherMethod.GET, "/api/v1/mcp/oauth/clients", {
        page,
        limit: 20,
    })

export const setMCPOAuthClientDisabled = (id: string, disabled: boolean) =>
    fetcher<void>(FetcherMethod.PUT, `/api/v1/mcp/oauth/clients/${encodeURIComponent(id)}`, {
        disabled,
    })
