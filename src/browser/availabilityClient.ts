import type {
    Page,
} from "playwright";

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
    await page.bringToFront();

    await page.waitForLoadState(
        "domcontentloaded",
    );

    const currentUrl =
        page.url();

    if (
        !/specsavers\.co\.uk/i.test(
            currentUrl,
        )
    ) {
        throw new Error(
            `Browser is not on the Specsavers site. Current URL: ${currentUrl}`,
        );
    }

    const result =
        await executeAvailabilityRequest(
            page,
            request,
        );

    if (!result.ok) {
        throw new Error(
            `Availability request failed with status ${result.status}: ${result.text}`,
        );
    }

    let parsed:
        AvailabilityGraphQLResponse;

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
        parsed.data
            ?.storeAppointmentSlots
            ?.[0]
            ?.availableSlots ??
        []
    );
}

async function executeAvailabilityRequest(
    page: Page,
    request: AvailabilityRequest,
): Promise<BrowserGraphQLResult> {
    return page.evaluate(
        async (payload) => {
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
                        availableSlots(
                            query: $slotsQuery
                        ) {
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

            const response =
                await fetch(
                    "/graphql",
                    {
                        method: "POST",

                        headers: {
                            "content-type":
                                "application/json",

                            "accept":
                                "*/*",

                            "apollographql-client-name":
                                "nuxt-find-and-book",

                            "apollographql-client-version":
                                "1.1219.0",

                            "x-specsavers-application-id":
                                "nuxt-find-and-book/1.1219.0",

                            "x-specsavers-market-id":
                                "GB",
                        },

                        credentials:
                            "include",

                        body:
                            JSON.stringify({
                                operationName:
                                    "GetAvailableAppointmentSlots",

                                query,

                                variables: {
                                    lineOfBusiness:
                                        payload
                                            .lineOfBusiness ??
                                        "OPTICAL",

                                    slotsQuery: {
                                        maxNumberOfDays:
                                            payload
                                                .maxNumberOfDays ??
                                            42,

                                        slotType:
                                        payload.slotType,

                                        startDate:
                                        payload.startDate,
                                    },

                                    storeNumbers: [
                                        String(
                                            payload
                                                .storeNumber,
                                        ),
                                    ],
                                },
                            }),
                    },
                );

            return {
                ok: response.ok,
                status:
                response.status,
                text:
                    await response.text(),
            };
        },
        request,
    );
}