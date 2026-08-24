export interface ManualAvailabilityEntry {
    key: string;
    label: string;

    nextAvailableDate: string | null;
    nextAvailableTime: string | null;

    updatedAt: string;
}

export type ManualAvailabilityData = Record<string, ManualAvailabilityEntry>;