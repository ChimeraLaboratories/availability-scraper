import {
    getBrowserContext,
    getPage,
} from "./browserSession.js";

import {
    safeCurrentUrl,
} from "../utils/browser.js";

import {
    getErrorMessage,
} from "../utils/errors.js";

import type {
    BrowserStatus,
    SaveBrowserStateResult,
} from "../types/browser.js";

const STORAGE_STATE_PATH =
    process.env.BROWSER_STORAGE_STATE_PATH ??
    "./browser-state.json";

export async function getBrowserStatus():
    Promise<BrowserStatus> {
    const context = getBrowserContext();
    const page = getPage();

    if (!context || !page) {
        return {
            ok: false,
            browserOpen: false,
            ready: false,
            message: "Browser is not open.",
        };
    }

    try {
        const url = safeCurrentUrl(page);
        const title = await page.title();

        return {
            ok: true,
            browserOpen: true,
            ready: url !== "about:blank",
            currentUrl: url,
            url,
            title,
            message:
                url === "about:blank"
                    ? "Browser is open but no page is loaded."
                    : "Browser session is available.",
        };
    } catch (error: unknown) {
        return {
            ok: false,
            browserOpen: true,
            ready: false,
            message: getErrorMessage(error),
        };
    }
}

export async function saveBrowserState():
    Promise<SaveBrowserStateResult> {
    const context = getBrowserContext();

    if (!context) {
        return {
            ok: false,
            error: "Browser is not open.",
        };
    }

    try {
        await context.storageState({
            path: STORAGE_STATE_PATH,
        });

        return {
            ok: true,
        };
    } catch (error: unknown) {
        return {
            ok: false,
            error: getErrorMessage(error),
        };
    }
}