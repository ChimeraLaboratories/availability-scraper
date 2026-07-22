import {
    handleCookies,
} from "../browser/cookieHandler.js";

import {
    safeCurrentUrl,
} from "../utils/browser.js";
import {ensureBrowser} from "../browser/browserManager.js";

export interface SiteNavigationResult {
    ok: true;
    url: string;
    message: string;
}

const LOCATION_PAGE_URL =
    "https://www.specsavers.co.uk/book/location";

export async function goToBookingSite():
    Promise<SiteNavigationResult> {
    const page = await ensureBrowser();

    await page.bringToFront();

    await page.goto(
        LOCATION_PAGE_URL,
        {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        },
    );

    await handleCookies(page);

    return {
        ok: true,
        url: safeCurrentUrl(page),
        message:
            "Navigate manually in noVNC and complete verification.",
    };
}