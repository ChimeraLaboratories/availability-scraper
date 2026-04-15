import { chromium } from "playwright";

let context;
let page;

const EDGE_USER_DATA_DIR =
    "C:\\Users\\CaneE\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default";

async function ensureBrowser() {
    if (context && page) {
        return page;
    }

    context = await chromium.launchPersistentContext(EDGE_USER_DATA_DIR, {
        channel: "msedge",
        headless: false,
        slowMo: 150,
        viewport: null,
        args: [
            "--disable-blink-features=AutomationControlled",
        ],
        locale: "en-GB",
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0",
    });

    const existingPages = context.pages();
    page = existingPages.length ? existingPages[0] : await context.newPage();

    await page.goto("https://www.specsavers.co.uk/book/location", {
        waitUntil: "domcontentloaded",
    });

    return page;
}

export async function openBrowserSession() {
    const page = await ensureBrowser();

    await page.bringToFront();
    await page.waitForLoadState("domcontentloaded");

    const acceptCookies = page.getByRole("button", { name: /accept all cookies/i });
    if (await acceptCookies.isVisible().catch(() => false)) {
        await acceptCookies.click();
        await page.waitForTimeout(1000);
    }

    return {
        url: page.url(),
        message:
            "Browser opened using your Edge profile. In the Edge window, complete the Specsavers flow until you reach the date-and-time page, then use Check availability.",
    };
}

export async function getBrowserStatus() {
    const page = await ensureBrowser();
    const url = page.url();

    return {
        url,
        ready: url.includes("/date-and-time"),
    };
}

function buildAvailabilityQuery() {
    return `
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
}

export async function fetchAvailabilityInBrowser({
                                                     storeNumber,
                                                     slotType,
                                                     startDate,
                                                     maxNumberOfDays = 42,
                                                     lineOfBusiness = "OPTICAL",
                                                 }) {
    const page = await ensureBrowser();

    const url = page.url();

    if (!url.includes("/date-and-time")) {
        throw new Error(
            `Browser not ready.\nCurrent URL: ${url}\n\nPlease do this in the opened Edge window:\n- Accept cookies\n- Select store (Peterborough Bridge Street)\n- Choose appointment type\n- Enter DOB\n- Continue until you are on the date-and-time page\nThen try again.`
        );
    }

    const result = await page.evaluate(
        async ({ storeNumber, slotType, startDate, maxNumberOfDays, lineOfBusiness, query }) => {
            const response = await fetch("https://www.specsavers.co.uk/graphql", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Accept": "*/*",
                    "Content-Type": "application/json",
                    "apollographql-client-name": "nuxt-find-and-book",
                    "apollographql-client-version": "1.1219.0",
                    "x-specsavers-application-id": "nuxt-find-and-book/1.1219.0",
                    "x-specsavers-market-id": "GB",
                    "x-correlation-id": crypto.randomUUID(),
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
            query: buildAvailabilityQuery(),
        }
    );

    if (!result.ok) {
        throw new Error(`GraphQL request failed: ${result.status}\n${result.text}`);
    }

    const json = JSON.parse(result.text);
    const days = json?.data?.storeAppointmentSlots?.[0]?.availableSlots ?? [];

    return days.map((day) => ({
        date: day.date,
        count: day.count,
        appointmentSlots: (day.appointmentSlots ?? []).map((slot) => ({
            id: slot.id,
            clinicId: slot.clinicId ?? null,
            slotType: slot.slotType,
            startTime: slot.startTime,
            endTime: slot.endTime ?? null,
        })),
    }));
}

export function filterAvailability(days, filters = {}) {
    const {
        weekdaysOnly = false,
        weekendsOnly = false,
        afterTime,
        beforeTime,
    } = filters;

    return days
        .map((day) => {
            const dateObj = new Date(`${day.date}T00:00:00`);
            const jsDay = dateObj.getDay();
            const isWeekend = jsDay === 0 || jsDay === 6;

            if (weekendsOnly && !isWeekend) return null;
            if (weekdaysOnly && isWeekend) return null;

            let slots = [...day.appointmentSlots];

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