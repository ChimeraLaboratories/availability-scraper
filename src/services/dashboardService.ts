import {
    dashboardCategories,
} from "../config/categories.js";

import type {
    DashboardCategoryResult,
    DashboardResponse,
} from "../types/dashboard.js";

import {
    filterAvailability,
} from "../utils/availabilityFilters.js";

import {
    formatDateTime,
} from "../utils/dates.js";

import {
    getErrorMessage,
} from "../utils/errors.js";
import {fetchAvailabilityInBrowser} from "../browser/availabilityService.js";
import {getManualCategoriesWithValues} from "./manualAvailabilityService.js";

export async function getDashboardAvailability(
    storeNumber: string,
    startDate: string,
): Promise<DashboardResponse> {
    const results: DashboardCategoryResult[] = [];

    for (const category of dashboardCategories) {
        try {
            const raw = await fetchAvailabilityInBrowser({
                storeNumber,
                slotType: category.slotType,
                startDate,
                maxNumberOfDays: 42,
                lineOfBusiness: category.lineOfBusiness,
            });

            const filtered = filterAvailability(
                raw,
                category.filters,
            );

            const firstDay = filtered[0] ?? null;
            const firstSlot =
                firstDay?.appointmentSlots?.[0] ?? null;

            results.push({
                key: category.key,
                label: category.label,
                lineOfBusiness: category.lineOfBusiness,
                slotType: category.slotType,
                filters: category.filters,
                nextAvailableDate:
                    firstDay?.date ?? null,
                nextAvailableTime:
                    firstSlot?.startTime ?? null,
                nextAvailableLabel:
                    firstDay?.date &&
                    firstSlot?.startTime
                        ? formatDateTime(
                            firstDay.date,
                            firstSlot.startTime,
                        )
                        : null,
                totalDays: filtered.length,
                totalSlots: filtered.reduce(
                    (sum, day) =>
                        sum +
                        day.appointmentSlots.length,
                    0,
                ),
                days: filtered,
            });
        } catch (error: unknown) {
            results.push({
                key: category.key,
                label: category.label,
                lineOfBusiness:
                category.lineOfBusiness,
                slotType: category.slotType,
                filters: category.filters,
                error: getErrorMessage(error),
                nextAvailableDate: null,
                nextAvailableTime: null,
                nextAvailableLabel: null,
                totalDays: 0,
                totalSlots: 0,
                days: [],
            });
        }
    }

    const manualCategories =
        await getManualCategoriesWithValues();

    for (const category of manualCategories) {
        results.push({
            key: category.key,
            label: category.label,

            lineOfBusiness: "MANUAL",
            slotType: "MANUAL",
            filters: {},

            nextAvailableDate:
            category.nextAvailableDate,

            nextAvailableTime:
            category.nextAvailableTime,

            nextAvailableLabel:
                category.nextAvailableDate &&
                category.nextAvailableTime
                    ? formatDateTime(
                        category.nextAvailableDate,
                        category.nextAvailableTime,
                    )
                    : null,

            totalDays:
                category.nextAvailableDate
                    ? 1
                    : 0,

            totalSlots:
                category.nextAvailableDate
                    ? 1
                    : 0,

            days: [],
        });
    }

    const nextAvailableOverall =
        results
            .filter(
                (result) =>
                    result.nextAvailableDate &&
                    result.nextAvailableTime,
            )
            .sort((a, b) => {
                const aValue =
                    `${a.nextAvailableDate}T${a.nextAvailableTime}`;

                const bValue =
                    `${b.nextAvailableDate}T${b.nextAvailableTime}`;

                return aValue.localeCompare(bValue);
            })[0] ?? null;

    return {
        storeNumber,
        startDate,
        nextAvailableOverall,
        categories: results,
    };
}