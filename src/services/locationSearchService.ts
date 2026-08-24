import {
    safeCurrentUrl,
} from "../utils/browser.js";
import {ensureBrowser} from "../browser/browserManager.js";

export interface LocationSearchResult {
    ok: true;
    message: string;
    url: string;
}

export async function searchLocation(
    location: string,
): Promise<LocationSearchResult> {
    const page = await ensureBrowser();

    await page.bringToFront();
    await page.waitForLoadState(
        "domcontentloaded",
    );

    const input = page
        .locator('input[type="text"]')
        .first();

    await input.waitFor({
        timeout: 15000,
    });

    await input.fill(location);
    await input.press("Enter");

    await page.waitForLoadState(
        "domcontentloaded",
    );

    return {
        ok: true,
        message:
            `Search submitted for ${location}`,
        url: safeCurrentUrl(page),
    };
}