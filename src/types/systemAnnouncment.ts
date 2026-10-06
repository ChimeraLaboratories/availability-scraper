export type SystemAnnouncmentScope = "GLOBAL" | "STORE";

export interface SystemAnnouncement {
    id: string;
    message: string;
    scope: SystemAnnouncmentScope;
    storeNumber: string | null;
    enabled: boolean;
    startsAt: string | null;
    endsAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export type SystemAnnouncmentData = SystemAnnouncement[];