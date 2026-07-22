import {ensureBrowser} from "../browser/browserManager.js";
import {safeCurrentUrl} from "../utils/browser.js";

export interface OpenBrowserResult {
    ok: true;
    message: string;
    url: string;
}

export interface ContinueBrowserResult {
    ok: true;
    message: string;
    url: string;
}

export async function openBrowserSession():
    Promise<OpenBrowserResult> {
    const page = await ensureBrowser();

    if (safeCurrentUrl(page) === "about:blank") {
        await page.bringToFront();
    }

    return {
        ok: true,
        message:
            "Browser opened. Use noVNC to navigate manually.",
        url: safeCurrentUrl(page),
    };
}

export async function continueBrowserSession():
    Promise<ContinueBrowserResult> {
    const page = await ensureBrowser();

    await page.bringToFront();

    await page.waitForLoadState(
        "domcontentloaded",
    );

    return {
        ok: true,
        url: safeCurrentUrl(page),
        message:
            "Session is ready. Continue with search from the existing verified browser.",
    };
}