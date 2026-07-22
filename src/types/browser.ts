export interface BrowserGraphQLResult {
    ok: boolean;
    status: number;
    text: string;
}

export interface BrowserStatus {
    ok: boolean;
    browserOpen: boolean;
    ready?: boolean;
    currentUrl?: string;
    url?: string;
    title?: string;
    blocked?: boolean;
    needsManualVerification?: boolean;
    message: string;
}

export interface SaveBrowserStateResult {
    ok: boolean;
    error?: string;
}

export interface CookieHandlerResult {
    ok: boolean;
    method:
        | "role-selector"
        | "dom-fallback"
        | "not-found"
        | "error";
    error?: string;
}