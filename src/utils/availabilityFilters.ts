import type {
    AppointmentSlot,
    AvailabilityDay,
} from "../types/availability.js";

import type {
    AvailabilityFilters,
} from "../types/dashboard.js";

import { isWeekend } from "./dates.js";

export function filterAvailability(
    days: AvailabilityDay[] = [],
    filters: AvailabilityFilters = {},
): AvailabilityDay[] {
    return days
        .map((day) => {
            let appointmentSlots: AppointmentSlot[] =
                Array.isArray(day.appointmentSlots)
                    ? [...day.appointmentSlots]
                    : [];

            if (filters.weekendsOnly && !isWeekend(day.date)) {
                appointmentSlots = [];
            }

            if (filters.weekdaysOnly && isWeekend(day.date)) {
                appointmentSlots = [];
            }

            if (filters.afterTime) {
                const afterTime = filters.afterTime;

                appointmentSlots = appointmentSlots.filter((slot) => slot.startTime >= afterTime,);
            }

            if (filters.beforeTime) {
                const beforeTime = filters.beforeTime;

                appointmentSlots = appointmentSlots.filter((slot) => slot.startTime < beforeTime,);
            }

            return {
                ...day,
                appointmentSlots,
            };
        })
        .filter(
            (day) =>
                day.appointmentSlots.length > 0,
        );
}