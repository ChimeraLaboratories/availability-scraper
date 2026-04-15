import { firefox } from "playwright";
import fs from "fs/promises";

let context;
let page;
let browser;

function looksBlocked(url, title) {
    return /challenge|verify|captcha|cloudflare/i.test(`${url} ${title}`);
}

async function acceptCookies(page) {
    const btn = page.getByRole("button", { name: /accept all cookies/i });

    if (await btn.count()) {
        try {
            await btn.first().click({ force: true, timeout: 5000 });
            console.log("Cookies accepted");
        } catch (e) {
            console.log("Cookie click failed, trying JS click");

            await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll("button"));
                const target = buttons.find((b) =>
                    (b.innerText || "").toLowerCase().includes("accept all cookies")
                );
                if (target) target.click();
            });
        }
    }
}

export async function ensureBrowser() {
    if (browser && page) return page;

    browser = await firefox.launch({
        headless: false,
        slowMo: 200,
    });

    context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
    });

    page = await context.newPage();
    return page;
}

export async function openBrowserSession() {
    const page = await ensureBrowser();
    await page.bringToFront();

    await page.goto("https://www.specsavers.co.uk/book/location", {
        waitUntil: "domcontentloaded",
    });

    await page.evaluate(() => {
        document.body.style.zoom = "100%";
    });

    await acceptCookies(page);

    return { ok: true };
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
    browser = null;
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