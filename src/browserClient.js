import { chromium } from "playwright";

let browser;
let page;

async function ensureBrowser() {
    if (browser && page) {
        return page;
    }

    browser = await chromium.launch({
        headless: false,
    });

    const context = await browser.newContext({
        viewport: { width: 1400, height: 900 },
    });

    page = await context.newPage();

    await page.goto("https://www.specsavers.co.uk/book/location", {
        waitUntil: "domcontentloaded",
    });

    return page;
}

function buildAvailabilityQuery() {
    return `
    query GetAvailableAppointmentSlots(
      $storeNumbers: [String!],
      $slotsQuery: AvailableSlotsQueryInput!,
      $lineOfBusiness: LineOfBusiness!
    ) {
      storeAppointmentSlots(
        storeNumbers: $storeNumbers
        lineOfBusiness: $lineOfBusiness
      ) {
        __typename
        availableSlots(query: $slotsQuery) {
          date
          count
          appointmentSlots {
            id
            clinicianId
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

    const result = await page.evaluate(
        async ({ storeNumber, slotType, startDate, maxNumberOfDays, lineOfBusiness, query }) => {
            const response = await fetch("/graphql", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "*/*",
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
            clinicianId: slot.clinicianId ?? null,
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