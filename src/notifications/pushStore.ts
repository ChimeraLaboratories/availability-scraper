import type webpush from "web-push";
import path from "node:path";
import fs from "node:fs/promises";

const DATA_DIRECTORY = path.resolve(process.cwd(), "data");

const SUBSCRIPTIONS_FILE = path.join(DATA_DIRECTORY, "push-subscriptions.json");

async function ensureDataDirectory(): Promise<void> {
    await fs.mkdir(DATA_DIRECTORY, {recursive: true});
}

async function readSubscriptions(): Promise<webpush.PushSubscription[]> {
    try {
        const contents = await fs.readFile(SUBSCRIPTIONS_FILE, "utf8");

        const parsed = JSON.parse(contents);

        return Array.isArray(parsed) ? parsed : [];
    } catch (error: unknown) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return [];
        }

        console.error("[PUSH] Failed to read subscriptions:", error);

        return [];
    }
}

async function writeSubscriptions(subscriptions: webpush.PushSubscription[]): Promise<void> {
    await ensureDataDirectory();

    await fs.writeFile(SUBSCRIPTIONS_FILE, JSON.stringify(subscriptions, null, 2), "utf8");
}

export async function savePushSubscription(subscription: webpush.PushSubscription): Promise<void> {
    const subscriptions = await readSubscriptions();

    const filtered = subscriptions.filter((existing) => existing.endpoint !== subscription.endpoint);

    filtered.push(subscription);

    await writeSubscriptions(filtered);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
    const subscriptions = await readSubscriptions();

    await writeSubscriptions(subscriptions.filter((subscription) => subscription.endpoint !== endpoint));
}

export async function getPushSubscriptions(): Promise<webpush.PushSubscription[]> {
    return readSubscriptions();
}

export async function getPushSubscriptionCount(): Promise<number> {
    const subscriptions = await readSubscriptions();

    return subscriptions.length;
}