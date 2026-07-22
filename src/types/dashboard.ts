import type {
    AvailabilityDay,
    LineOfBusiness,
} from "./availability.js";

export interface AvailabilityFilters {
    weekendsOnly?: boolean;
    afterTime?: string;
}

export interface DashboardCategory {
    key: string;
    label: string;
    lineOfBusiness: LineOfBusiness;
    slotType: string;
    filters: AvailabilityFilters;
}

export interface DashboardCategoryResult
    extends DashboardCategory {
    nextAvailableDate: string | null;
    nextAvailableTime: string | null;
    nextAvailableLabel: string | null;
    totalDays: number;
    totalSlots: number;
    days: AvailabilityDay[];
    error?: string;
}

export interface DashboardResponse {
    storeNumber: string;
    startDate: string;
    nextAvailableOverall:
        | DashboardCategoryResult
        | null;
    categories: DashboardCategoryResult[];
}