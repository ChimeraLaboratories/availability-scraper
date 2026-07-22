export type LineOfBusiness = "OPTICAL" | "AUDIOLOGY";

export interface AvailabilityRequest {
    storeNumber: string;
    slotType: string;
    startDate: string;
    maxNumberOfDays?: number;
    lineOfBusiness?: LineOfBusiness;
}

export interface AppointmentSlot {
    id: string;
    clinicId: string;
    slotType: string;
    startTime: string;
    endTime: string;
    __typename?: string;
}

export interface AvailabilityDay {
    date: string;
    count: number;
    appointmentSlots: AppointmentSlot[];
    __typename?: string;
}

export interface AvailabilityGraphQLResponse {
    data?: {
        storeAppointmentSlots?: Array<{
            availableSlots?: AvailabilityDay[];
        }>;
    };
}