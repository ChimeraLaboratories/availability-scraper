import {
    chromium,
} from "playwright";

import type {
    BrowserContext,
    Page,
} from "playwright";

import {
    clearBrowser,
    getBrowserContext,
    getPage,
    setBrowserContext,
    setPage,
} from "./browserSession.js";

import {
    installSpecsaversCookie,
} from "./specsaversCookie.js";
import * as os from "node:os";
import path from "node:path";

const PROFILE_DIR =
    process.env.BROWSER_PROFILE_DIR ??
    path.join(
        os.homedir(),
        ".availability-scraper",
        "browser-profile"
    );

let browserLaunchPromise:
    Promise<Page> | null = null;

function getUsablePage():
    Page | null {
    const context =
        getBrowserContext();

    if (!context) {
        return null;
    }

    const storedPage =
        getPage();

    if (
        storedPage &&
        !storedPage.isClosed()
    ) {
        return storedPage;
    }

    const existingPage =
        context
            .pages()
            .find(
                (page) =>
                    !page.isClosed(),
            );

    if (existingPage) {
        setPage(existingPage);

        return existingPage;
    }

    return null;
}

async function launchBrowser():
    Promise<Page> {
    const context =
        await chromium.launchPersistentContext(
            PROFILE_DIR,
            {
                headless: false,
                channel: "chromium",
                viewport: {
                    width: 1280,
                    height: 720,
                },
                ignoreHTTPSErrors: true,
                args: [
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                ],
            },
        );

    try {
        await installSpecsaversCookie(
            context,
        );

        setBrowserContext(context);

        const page =
            context
                .pages()
                .find(
                    (candidate) =>
                        !candidate.isClosed(),
                ) ??
            await context.newPage();

        setPage(page);

        context.once(
            "close",
            () => {
                clearBrowser();
            },
        );

        page.once(
            "close",
            () => {
                if (
                    getPage() === page
                ) {
                    setPage(null);
                }
            },
        );

        return page;
    } catch (error: unknown) {
        await context
            .close()
            .catch(() => undefined);

        clearBrowser();

        throw error;
    }
}

export async function ensureBrowser():
    Promise<Page> {
    const usablePage =
        getUsablePage();

    if (usablePage) {
        return usablePage;
    }

    const existingContext =
        getBrowserContext();

    if (existingContext) {
        try {
            const page =
                await existingContext.newPage();

            setPage(page);

            return page;
        } catch {
            clearBrowser();
        }
    }

    if (!browserLaunchPromise) {
        browserLaunchPromise =
            launchBrowser()
                .finally(() => {
                    browserLaunchPromise =
                        null;
                });
    }

    return browserLaunchPromise;
}

export function getExistingBrowser(): {
    browserContext: BrowserContext | null;
    page: Page | null;
} {
    return {
        browserContext:
            getBrowserContext(),

        page:
            getUsablePage(),
    };
}

export async function closeBrowser():
    Promise<void> {
    const pendingLaunch =
        browserLaunchPromise;

    if (pendingLaunch) {
        await pendingLaunch.catch(
            () => undefined,
        );
    }

    const context =
        getBrowserContext();

    clearBrowser();

    if (context) {
        await context
            .close()
            .catch(() => undefined);
    }
}