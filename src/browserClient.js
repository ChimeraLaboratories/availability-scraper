import { chromium } from "playwright";
import fs from "fs/promises";
import path from "path";

let browserContext = null;
let page = null;

const PROFILE_DIR =
    process.env.BROWSER_PROFILE_DIR || path.resolve("data/browser-profile");

function looksBlocked(url, title) {
    return /challenge|verify|captcha|cloudflare/i.test(`${url} ${title}`);
}

async function ensureProfileDir() {
    await fs.mkdir(PROFILE_DIR, { recursive: true });
}

export async function ensureBrowser() {
    if (browserContext) {
        const pages = browserContext.pages();
        page = pages[0] || page || (await browserContext.newPage());
        return page;
    }

    await ensureProfileDir();

    browserContext = await chromium.launchPersistentContext(PROFILE_DIR, {
        headless: false,
        channel: "chromium",
        viewport: { width: 1920, height: 1080 },
        ignoreHTTPSErrors: true,
        args: [
            "--start-maximized",
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ],
    });

    await browserContext.addInitScript(() => {
        Object.defineProperty(navigator, "cookieEnabled", {
            get: () => true,
        });
    });

    const pages = browserContext.pages();
    page = pages[0] || (await browserContext.newPage());

    return page;
}

export async function openBrowserSession() {
    const currentPage = await ensureBrowser();
    await currentPage.bringToFront();

    return {
        ok: true,
        url: currentPage.url(),
        message: "Browser session is open.",
    };
}

export function getExistingBrowser() {
    if (!browserContext) return null;

    const pages = browserContext.pages();

    return {
        context: browserContext,
        page: pages[0] || page || null,
    };
}

export async function closeBrowser() {
    if (browserContext) {
        await browserContext.close();
    }

    browserContext = null;
    page = null;

    return { ok: true };
}

export async function saveBrowserState() {
    if (!browserContext) {
        return { ok: false, error: "Browser is not open." };
    }

    await browserContext.storageState({
        path: path.join(PROFILE_DIR, "storage-state.json"),
    });

    return { ok: true };
}

export async function getBrowserStatus() {
    const existing = getExistingBrowser();

    if (!existing?.page) {
        return {
            ok: true,
            browserOpen: false,
            needsManualVerification: true,
            message: "Browser not open yet.",
        };
    }

    const currentPage = existing.page;
    const url = currentPage.url();
    const title = await currentPage.title();

    return {
        ok: true,
        browserOpen: true,
        url,
        title,
        needsManualVerification: looksBlocked(url, title),
        message: "Browser session is open.",
    };
}