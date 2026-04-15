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
        viewport: { width: 1280, height: 720 },
        ignoreHTTPSErrors: true,
        args: [
            "--disable-blink-features=AutomationControlled",
            "--no-sandbox",
            "--disable-dev-shm-usage",
        ],
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

export async function fetchAvailabilityInBrowser({
                                                     storeNumber,
                                                     slotType,
                                                     startDate,
                                                     maxNumberOfDays = 42,
                                                     lineOfBusiness = "OPTICAL",
                                                 }) {
    const page = await ensureBrowser();

    await page.bringToFront();
    await page.waitForLoadState("domcontentloaded");

    const currentUrl = page.url();
    const currentTitle = await page.title();

    if (looksBlocked(currentUrl, currentTitle)) {
        throw new Error(
            "Manual verification still required in noVNC before availability can be fetched."
        );
    }

    if (!/specsavers\.co\.uk/i.test(currentUrl)) {
        throw new Error(
            `Browser is not on the Specsavers site. Current URL: ${currentUrl}`
        );
    }

    const result = await page.evaluate(
        async ({ storeNumber, slotType, startDate, maxNumberOfDays, lineOfBusiness }) => {
            const query = `
        query GetAvailableAppointmentSlots(
          $storeNumbers: [String!]!,
          $slotsQuery: AvailableSlotsQueryInput!,
          $lineOfBusiness: LineOfBusiness!
        ) {
          storeAppointmentSlots(
            storeNumbers: $storeNumbers
            lineOfBusiness: $lineOfBusiness
          ) {
            availableSlots(query: $slotsQuery) {
              date
              count
              appointmentSlots {
                id
                clinicId
                slotType
                startTime
                endTime
                __typename
              }
              __typename
            }
            __typename
          }
        }
      `;

            const response = await fetch("/graphql", {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    accept: "*/*",
                    "apollographql-client-name": "nuxt-find-and-book",
                    "apollographql-client-version": "1.1219.0",
                    "x-specsavers-application-id": "nuxt-find-and-book/1.1219.0",
                    "x-specsavers-market-id": "GB",
                },
                body: JSON.stringify({
                    operationName: "GetAvailableAppointmentSlots",
                    query,
                    variables: {
                        lineOfBusiness,
                        slotsQuery: {
                            maxNumberOfDays,
                            slotType,
                            startDate,
                        },
                        storeNumbers: [String(storeNumber)],
                    },
                }),
                credentials: "include",
            });

            const text = await response.text();

            return {
                ok: response.ok,
                status: response.status,
                text,
            };
        },
        {
            storeNumber,
            slotType,
            startDate,
            maxNumberOfDays,
            lineOfBusiness,
        }
    );

    if (!result.ok) {
        throw new Error(`GraphQL request failed: ${result.status}\n${result.text}`);
    }

    const json = JSON.parse(result.text);
    return json?.data?.storeAppointmentSlots?.[0]?.availableSlots ?? [];
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