import { chromium } from "playwright";

let context;
let page;

const USER_DATA_DIR = "C:\\temp\\availability-edge-profile";

async function ensureBrowser() {
    if (context && page) {
        return page;
    }

    context = await chromium.launchPersistentContext(USER_DATA_DIR, {
        channel: "msedge",
        headless: false,
        viewport: null,
        locale: "en-GB",
        args: [
            "--disable-blink-features=AutomationControlled",
        ],
    });

    const pages = context.pages();
    page = pages.length ? pages[0] : await context.newPage();

    await page.goto("https://www.specsavers.co.uk/book/location", {
        waitUntil: "domcontentloaded",
    });

    return page;
}

export async function openBrowserSession() {
    const page = await ensureBrowser();

    await page.bringToFront();
    await page.waitForLoadState("domcontentloaded");

    return {
        url: page.url(),
        message: "Browser opened.",
    };
}

export async function getBrowserStatus() {
    if (!page) {
        return { url: null, ready: false };
    }

    return {
        url: page.url(),
        ready: true,
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