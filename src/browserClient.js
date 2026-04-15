import { firefox } from "playwright";
import fs from "fs/promises";

let context;
let page;

function looksBlocked(url = "", title = "") {
    return /challenge|verify|captcha|cloudflare/i.test(`${url} ${title}`);
}

export async function ensureBrowser() {
    if (context) {
        const pages = context.pages();
        page = pages[0] ?? page ?? null;
        if (page) return page;
    }

    context = await firefox.launchPersistentContext("/app/.auth/firefox-profile", {
        headless: false,
        slowMo: 200,
        viewport: { width: 1920, height: 1080 },
    });

    page = context.pages()[0] ?? await context.newPage();
    await page.bringToFront();

    return page;
}

export async function openBrowserSession() {
    const page = await ensureBrowser();
    await page.bringToFront();

    return {
        ok: true,
        url: page.url(),
        title: await page.title().catch(() => ""),
    };
}

export function getExistingBrowser() {
    if (!context) return null;

    const pages = context.pages();
    return {
        context,
        page: pages[0] ?? page ?? null,
    };
}

export async function saveBrowserState() {
    if (!context) return { ok: false, error: "No browser context" };

    await context.storageState({ path: "/app/.auth/storage-state.json" });

    return { ok: true };
}

export async function closeBrowser() {
    if (context) {
        await context.close();
    }
    context = null;
    page = null;
}