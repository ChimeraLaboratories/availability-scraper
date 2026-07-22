import type {
    AvailabilityDay,
    AvailabilityRequest,
} from "../types/availability.js";

import {
    ensureBrowser,
} from "./browserManager.js";

import {
    fetchAvailabilityFromPage,
} from "./availabilityClient.js";

export async function fetchAvailabilityInBrowser(
    request: AvailabilityRequest,
): Promise<AvailabilityDay[]> {
    const page =
        await ensureBrowser();

    return fetchAvailabilityFromPage(
        page,
        request,
    );
}