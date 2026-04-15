const GRAPHQL_URL = "https://www.specsavers.co.uk/graphql";

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

export async function fetchAvailability({
                                            storeNumber,
                                            slotType,
                                            startDate,
                                            maxNumberOfDays = 42,
                                            lineOfBusiness = "OPTICAL",
                                        }) {
    if (!storeNumber) {
        throw new Error("storeNumber is required");
    }
    if (!slotType) {
        throw new Error("slotType is required");
    }
    if (!startDate) {
        throw new Error("startDate is required");
    }

    const body = {
        operationName: "GetAvailableAppointmentSlots",
        query: buildAvailabilityQuery(),
        variables: {
            lineOfBusiness,
            slotsQuery: {
                maxNumberOfDays,
                slotType,
                startDate,
            },
            storeNumbers: [String(storeNumber)],
        },
    };

    const response = await fetch(GRAPHQL_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "*/*",
            "Origin": "https://www.specsavers.co.uk",
            "Referer": "https://www.specsavers.co.uk/",
            "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
            "Cookie": process.env.SPECSAVERS_COOKIE || "",
        },
        body: JSON.stringify(body),
    });

    const rawText = await response.text();

    if (!response.ok) {
        throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}\n${rawText}`);
    }

    const json = await response.json();

    if (json.errors?.length) {
        throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
    }

    const storeSlots = json?.data?.storeAppointmentSlots?.[0]?.availableSlots ?? [];

    return storeSlots.map((day) => ({
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