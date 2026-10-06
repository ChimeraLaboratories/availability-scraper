import path from "node:path";
import {SystemAnnouncement, SystemAnnouncmentData} from "../types/systemAnnouncment.js";
import fs from "node:fs/promises";

const DATA_FILE = path.resolve(process.cwd(), 'data/system-announcements.json');

export async function getSystemAnnouncements(): Promise<SystemAnnouncmentData> {
    try {
        const raw = await fs.readFile(DATA_FILE, "utf8");

        return JSON.parse(raw) as SystemAnnouncmentData;
    } catch (error: unknown) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return [];
        }

        throw error;
    }
}

export async function saveSystemAnnouncements(announcements: SystemAnnouncmentData): Promise<void> {
    await fs.mkdir(path.dirname(DATA_FILE), {recursive: true});

    await fs.writeFile(DATA_FILE, JSON.stringify(announcements, null, 2), "utf8");
}

export async function getActiveSystemAnnouncements(storeNumber?: string): Promise<SystemAnnouncmentData> {
    const announcements = await getSystemAnnouncements();

    const now = Date.now();

    return announcements.filter((announcement) => {
        if (!announcement.enabled) {
            return false;
        }

        if (announcement.scope === "STORE" && announcement.storeNumber !== storeNumber) {
            return false;
        }

        if (announcement.startsAt && new Date(announcement.startsAt).getTime() > now) {
            return false;
        }

        if (announcement.endsAt && new Date(announcement.endsAt).getTime() <= now) {
            return false;
        }

        return true;
    });
}

export async function createSystemAnnouncement(input: { message: string; scope: SystemAnnouncement["scope"]; storeNumber: string | null; enabled: boolean; startsAt: string | null; endsAt: string | null; }): Promise<SystemAnnouncement> {
    const announcements = await getSystemAnnouncements();

    const now = new Date().toISOString();

    const announcement: SystemAnnouncement = {
        id: crypto.randomUUID(),
        message: input.message,
        scope: input.scope,
        storeNumber: input.storeNumber,
        enabled: input.enabled,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        createdAt: now,
        updatedAt: now,
    };

    announcements.push(announcement);

    await saveSystemAnnouncements(announcements);

    return announcement;
}

export async function updateSystemAnnouncement(id: string, updates: Partial<Pick<SystemAnnouncement, | "message" | "scope" | "storeNumber" | "enabled" | "startsAt" | "endsAt">>,): Promise<SystemAnnouncement | null> {
    const announcements = await getSystemAnnouncements();

    const index = announcements.findIndex((announcement) => announcement.id === id,);

    if (index === -1) {
        return null;
    }

    const updated: SystemAnnouncement = {
        ...announcements[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    if (
        updated.scope === "STORE" &&
        !updated.storeNumber
    ) {
        throw new Error(
            "Store number is required for STORE announcements.",
        );
    }

    if (
        updated.startsAt &&
        updated.endsAt &&
        Date.parse(updated.endsAt) <=
        Date.parse(updated.startsAt)
    ) {
        throw new Error(
            "End date must be after start date.",
        );
    }

    announcements[index] = updated;

    await saveSystemAnnouncements(announcements,);

    return updated;
}

export async function deleteSystemAnnouncement(id: string,): Promise<boolean> {
    const announcements = await getSystemAnnouncements();

    const remaining = announcements.filter((announcement) => announcement.id !== id,);

    if (remaining.length === announcements.length) {
        return false;
    }

    await saveSystemAnnouncements(remaining,);

    return true;
}