import {
    chromium,
} from "playwright";

import type {
    Browser,
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

const BROWSER_CDP_URL =
    process.env.BROWSER_CDP_URL?.trim() ||
    null;

let browserLaunchPromise:
    Promise<Page> | null = null;

let remoteBrowser:
    Browser | null = null;

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

async function initialiseContext(
    context: BrowserContext,
): Promise<Page> {
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
}

async function getRemoteWebSocketUrl(
    cdpUrl: string,
): Promise<string> {
    const versionUrl =
        new URL(
            "/json/version",
            cdpUrl.endsWith("/")
                ? cdpUrl
                : `${cdpUrl}/`,
        );

    const response =
        await fetch(
            versionUrl,
            {
                headers: {
                    Host: "localhost",
                },
            },
        );

    if (!response.ok) {
        throw new Error(
            `Remote Chromium CDP endpoint returned ${response.status}.`,
        );
    }

    const data =
        await response.json() as {
            webSocketDebuggerUrl?: string;
        };

    if (!data.webSocketDebuggerUrl) {
        throw new Error(
            "Remote Chromium did not return a webSocketDebuggerUrl.",
        );
    }

    const websocketUrl =
        new URL(
            data.webSocketDebuggerUrl,
        );

    const publicCdpUrl =
        new URL(
            cdpUrl,
        );

    websocketUrl.protocol =
        publicCdpUrl.protocol === "https:"
            ? "wss:"
            : "ws:";

    websocketUrl.host =
        publicCdpUrl.host;

    return websocketUrl.toString();
}

async function connectToRemoteBrowser():
    Promise<Page> {
    if (!BROWSER_CDP_URL) {
        throw new Error(
            "BROWSER_CDP_URL is not configured.",
        );
    }

    console.log(
        `Connecting to browser over CDP: ${BROWSER_CDP_URL}`,
    );

    const websocketUrl =
        await getRemoteWebSocketUrl(
            BROWSER_CDP_URL,
        );

    const browser =
        await chromium.connectOverCDP(
            websocketUrl,
            {
                headers: {
                    Host: "localhost",
                },
            },
        );

    remoteBrowser = browser;

    browser.once(
        "disconnected",
        () => {
            if (
                remoteBrowser === browser
            ) {
                remoteBrowser = null;
            }

            clearBrowser();
        },
    );

    const context =
        browser.contexts()[0];

    if (!context) {
        throw new Error(
            "Remote Chromium did not expose a default browser context.",
        );
    }

    return initialiseContext(
        context,
    );
}

async function launchLocalBrowser():
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
        context.once(
            "close",
            () => {
                clearBrowser();
            },
        );

        return await initialiseContext(
            context,
        );
    } catch (error: unknown) {
        await context
            .close()
            .catch(() => undefined);

        clearBrowser();

        throw error;
    }
}

async function launchBrowser():
    Promise<Page> {
    if (BROWSER_CDP_URL) {
        return connectToRemoteBrowser();
    }

    console.log(
        "BROWSER_CDP_URL not set; launching local Chromium.",
    );

    return launchLocalBrowser();
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

    if (BROWSER_CDP_URL) {
        // The browser is owned by the dedicated browser container.
        // Disconnecting the scraper must not terminate Chromium or its profile.
        remoteBrowser = null;
        return;
    }

    if (context) {
        await context
            .close()
            .catch(() => undefined);
    }
}
