import type { Cookie } from "playwright";
import {getExistingBrowser} from "../browser/browserManager.js";

export interface DebugCookie {
    name: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly: boolean;
    secure: boolean;
}

export interface DebugCookiesResult {
    ok: true;
    count: number;
    cookies: DebugCookie[];
}

export async function getBrowserCookies():
    Promise<DebugCookiesResult> {
    const existing = getExistingBrowser();

    if (!existing.page) {
        throw new Error("Browser not open");
    }

    if (!existing.browserContext) {
        throw new Error("Browser is not open");
    }

    const cookies =
        await existing.browserContext.cookies();

    return {
        ok: true,
        count: cookies.length,
        cookies: cookies.map(
            (cookie: Cookie) => ({
                name: cookie.name,
                domain: cookie.domain,
                path: cookie.path,
                expires: cookie.expires,
                httpOnly: cookie.httpOnly,
                secure: cookie.secure,
            }),
        ),
    };
}