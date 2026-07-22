import type { Page } from "playwright";

import type {
    AvailabilityDay,
    AvailabilityGraphQLResponse,
    AvailabilityRequest,
} from "../types/availability.js";

import type {
    BrowserGraphQLResult,
} from "../types/browser.js";

import {
    getErrorMessage,
} from "../utils/errors.js";

export async function fetchAvailabilityFromPage(
    page: Page,
    request: AvailabilityRequest,
): Promise<AvailabilityDay[]> {
    const result = await executeAvailabilityRequest(
        page,
        request,
    );

    if (!result.ok) {
        throw new Error(
            `Availability request failed with status ${result.status}: ${result.text}`,
        );
    }

    let parsed: AvailabilityGraphQLResponse;

    try {
        parsed = JSON.parse(
            result.text,
        ) as AvailabilityGraphQLResponse;
    } catch (error: unknown) {
        throw new Error(
            `Could not parse availability response: ${getErrorMessage(error)}`,
        );
    }

    return (
        parsed.data?.storeAppointmentSlots?.[0]
            ?.availableSlots ?? []
    );
}

async function executeAvailabilityRequest(
    page: Page,
    request: AvailabilityRequest,
): Promise<BrowserGraphQLResult> {
    return page.evaluate(
        async (payload) => {
            const response = await fetch(
                "/graphql",
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        query: `
                            query StoreAppointmentSlots(
                                $storeNumber: String!
                                $slotType: String!
                                $startDate: String!
                                $maxNumberOfDays: Int!
                                $lineOfBusiness: String!
                            ) {
                                storeAppointmentSlots(
                                    storeNumber: $storeNumber
                                    slotType: $slotType
                                    startDate: $startDate
                                    maxNumberOfDays: $maxNumberOfDays
                                    lineOfBusiness: $lineOfBusiness
                                ) {
                                    availableSlots {
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
                                }
                            }
                        `,
                        variables: {
                            storeNumber: payload.storeNumber,
                            slotType: payload.slotType,
                            startDate: payload.startDate,
                            maxNumberOfDays:
                                payload.maxNumberOfDays ?? 60,
                            lineOfBusiness:
                                payload.lineOfBusiness ??
                                "OPTICAL",
                        },
                    }),
                },
            );

            return {
                ok: response.ok,
                status: response.status,
                text: await response.text(),
            };
        },
        request,
    );
}