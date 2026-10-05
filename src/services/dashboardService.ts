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

import {
    fetchAvailabilityInBrowser,
} from "../browser/availabilityService.js";

import {
    getManualCategoriesWithValues,
} from "./manualAvailabilityService.js";

import {
    getScraperScheduleStatus,
} from "../utils/scraperSchedule.js";

import {
    getDashboardCache,
    saveDashboardCache,
} from "./dashboardCacheService.js";
import {recordAvailabilityFailure, recordAvailabilitySuccess} from "../notifications/availabilityAlertService.js";
import {sendDeveloperNotification} from "../notifications/developerNotificationService.js";

export async function getDashboardAvailability(
    storeNumber: string,
    startDate: string,
): Promise<DashboardResponse> {
    let results:
        DashboardCategoryResult[] = [];

    let lastUpdatedAt: string | null = null;

    const schedule =
        getScraperScheduleStatus();

    /*
     * LIVE AVAILABILITY
     *
     * Only contact the booking service while
     * the scraper schedule is active.
     */
    if (schedule.active) {
        for (const category of dashboardCategories) {
            try {
                const raw =
                    await fetchAvailabilityInBrowser(
                        {
                            storeNumber,

                            slotType:
                            category.slotType,

                            startDate,

                            maxNumberOfDays:
                                42,

                            lineOfBusiness:
                            category.lineOfBusiness,
                        },
                    );

                const filtered =
                    filterAvailability(
                        raw,
                        category.filters,
                    );

                const firstDay =
                    filtered[0] ??
                    null;

                const firstSlot =
                    firstDay
                        ?.appointmentSlots
                        ?.[0] ??
                    null;

                results.push({
                    key:
                    category.key,

                    label:
                    category.label,

                    lineOfBusiness:
                    category.lineOfBusiness,

                    slotType:
                    category.slotType,

                    filters:
                    category.filters,

                    nextAvailableDate:
                        firstDay?.date ??
                        null,

                    nextAvailableTime:
                        firstSlot
                            ?.startTime ??
                        null,

                    nextAvailableLabel:
                        firstDay?.date &&
                        firstSlot?.startTime
                            ? formatDateTime(
                                firstDay.date,
                                firstSlot.startTime,
                            )
                            : null,

                    totalDays:
                    filtered.length,

                    totalSlots:
                        filtered.reduce(
                            (
                                sum,
                                day,
                            ) =>
                                sum +
                                day
                                    .appointmentSlots
                                    .length,
                            0,
                        ),

                    days:
                    filtered,
                });

                const recovery = recordAvailabilitySuccess(category.key);

                if (recovery.recovered) {
                    console.log("[AVAILABILITY] Category recovered", {
                        category: category.key,
                        previousFailures: recovery.previousFailures
                    });

                    await sendDeveloperNotification(
                        `✅ Availability Restored — ${category.label}`,
                        `Store ${storeNumber} • Scraping successfully again after ${recovery.previousFailures} failed checks.`,
                    );
                }

            } catch (error: unknown) {
                const message = getErrorMessage(error);

                const failure = recordAvailabilityFailure(category.key, message);

                if (failure.shouldAlert) {
                    console.error("[AVAILABILITY] Category reached alert threshold", {
                        category: category.key,
                        consecutiveFailures: failure.consecutiveFailures,
                        error: message
                    });

                    await sendDeveloperNotification(
                        `⚠️ Availability Error — ${category.label}`,
                        `Store ${storeNumber} • Failed ${failure.consecutiveFailures} consecutive checks`,
                    );
                }

                console.error("[AVAILABILITY] Category failed", {
                    category: category.key,
                    lineOfBusiness: category.lineOfBusiness,
                    error: message,
                });

                /*
                 * Keep upstream Hearcare errors simple on the dashboard.
                 * The actual error is still written to the server log.
                 */

                const displayedError =
                    category.lineOfBusiness === "AUDIOLOGY" &&
                    message.startsWith("GraphQL availability request failed:")
                        ? "Hearcare availability temporarily unavailable"
                        : message;

                results.push({
                    key: category.key,

                    label: category.label,

                    lineOfBusiness: category.lineOfBusiness,

                    slotType: category.slotType,

                    filters: category.filters,

                    error: displayedError,

                    nextAvailableDate: null,

                    nextAvailableTime: null,

                    nextAvailableLabel: null,

                    totalDays: 0,

                    totalSlots: 0,

                    days: [],
                });
            }
        }

        /*
         * Save the latest automatic results.
         *
         * Manual categories are deliberately
         * NOT stored in this cache because they
         * have their own persistent storage.
         */
        await saveDashboardCache(
            results,
        );

        lastUpdatedAt = new Date().toISOString();

    } else {
        /*
         * OUTSIDE SCRAPER HOURS
         *
         * Do not contact the booking service.
         * Display the last saved automatic
         * availability instead.
         */

        const cache =
            await getDashboardCache();

        if (cache) {
            results =
                cache.categories;

            lastUpdatedAt = cache.updatedAt;
        }
    }

    /*
     * MANUAL AVAILABILITY
     *
     * These are always loaded, regardless of
     * whether automatic scraping is active.
     */
    const manualCategories =
        await getManualCategoriesWithValues();

    for (
        const category of
        manualCategories
        ) {
        results.push({
            key:
            category.key,

            label:
            category.label,

            lineOfBusiness:
                "MANUAL",

            slotType:
                "MANUAL",

            filters:
                {},

            nextAvailableDate:
            category
                .nextAvailableDate,

            nextAvailableTime:
            category
                .nextAvailableTime,

            nextAvailableLabel:
                category
                    .nextAvailableDate &&
                category
                    .nextAvailableTime
                    ? formatDateTime(
                        category
                            .nextAvailableDate,

                        category
                            .nextAvailableTime,
                    )
                    : null,

            totalDays:
                category
                    .nextAvailableDate
                    ? 1
                    : 0,

            totalSlots:
                category
                    .nextAvailableDate
                    ? 1
                    : 0,

            days:
                [],
        });
    }

    /*
     * Find the earliest availability across
     * automatic + manual categories.
     */
    const nextAvailableOverall =
        results
            .filter(
                (result) =>
                    result
                        .nextAvailableDate &&
                    result
                        .nextAvailableTime,
            )
            .sort(
                (a, b) => {
                    const aValue =
                        `${a.nextAvailableDate}T${a.nextAvailableTime}`;

                    const bValue =
                        `${b.nextAvailableDate}T${b.nextAvailableTime}`;

                    return aValue.localeCompare(
                        bValue,
                    );
                },
            )[0] ??
        null;

    return {
        storeNumber,
        startDate,
        nextAvailableOverall,
        categories:
        results,
        schedule,
        lastUpdatedAt,
    };
}