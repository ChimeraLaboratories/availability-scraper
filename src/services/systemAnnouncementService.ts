import path from "node:path";
import {SystemAnnouncment, SystemAnnouncmentData} from "../types/systemAnnouncment.js";
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