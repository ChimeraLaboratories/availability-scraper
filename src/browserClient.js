import { firefox } from "playwright";
import fs from "fs/promises";

let context;
let page;
let browser;

const USER_DATA_DIR =
    process.env.PLAYWRIGHT_USER_DATA_DIR || "/data/chromium-profile";

function looksBlocked(url, title) {
    return /challenge|verify|captcha|cloudflare/i.test(`${url} ${title}`);
}

async function ensureBrowser() {
    if (browser && page) return page;

    browser = await firefox.launch({
        headless: false,
        slowMo: 200,
    });

    context = await browser.newContext({
        viewport: { width: 1400, height: 900 },
    });

    page = await context.newPage();
    return page;
}

export function getExistingBrowser() {
    if (!context) return null;

    const pages = context.pages();
    return {
        context,
        page: pages[0] ?? page ?? null,
    };
}

export async function closeBrowser() {
    if (context) {
        await context.close();
    }
    context = null;
    page = null;
}

export async function openBrowserSession() {
    const { page } = await ensureBrowser();

    await page.bringToFront();
    await page.waitForLoadState("domcontentloaded");

    return {
        url: page.url(),
        message: "Browser opened.",
    };
}

export async function getBrowserStatus() {
    if (!page) {
        return {
            url: null,
            title: null,
            ready: false,
            needsManualVerification: true,
        };
    }

    const url = page.url();
    const title = await page.title();

    return {
        url,
        title,
        ready: true,
        needsManualVerification: looksBlocked(url, title),
    };
}

export async function fetchAvailabilityInBrowser({
                                                     storeNumber,
                                                     slotType,
                                                     startDate,
                                                     maxNumberOfDays = 42,
                                                     lineOfBusiness = "OPTICAL",
                                                 }) {
    const { page } = await ensureBrowser();

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

export function filterAvailability(days, filters = {}) {
    const {
        weekdaysOnly = false,
        weekendsOnly = false,
        afterTime,
        beforeTime,
    } = filters;

    return (days || [])
        .map((day) => {
            const dateObj = new Date(`${day.date}T00:00:00`);
            const jsDay = dateObj.getDay();
            const isWeekend = jsDay === 0 || jsDay === 6;

            if (weekendsOnly && !isWeekend) return null;
            if (weekdaysOnly && isWeekend) return null;

            let slots = [...(day.appointmentSlots || [])];

            if (afterTime) {
                slots = slots.filter((s) => s.startTime >= afterTime);
            }

            if (beforeTime) {
                slots = slots.filter((s) => s.startTime <= beforeTime);
            }

            return {
                ...day,
                count: slots.length,
                appointmentSlots: slots,
            };
        })
        .filter(Boolean)
        .filter((day) => day.appointmentSlots.length > 0);
}