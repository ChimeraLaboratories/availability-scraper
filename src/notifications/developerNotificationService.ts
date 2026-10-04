import {getPushSubscriptions, removePushSubscription} from "./pushStore.js";
import {sendPushNotification} from "./pushService.js";

export async function sendDeveloperNotification(title: string, body: string): Promise<void> {
    const subscriptions = await getPushSubscriptions();

    if (subscriptions.length === 0) {
        console.log("[PUSH] No developer subscriptions registered.");
        return;
    }

    await Promise.all(subscriptions.map(async (subscription) => {
        try {
            await sendPushNotification(subscription, title, body);
        } catch (error: unknown) {
            const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? error.statusCode : undefined;

            if (statusCode === 404 || statusCode === 410) {
                await removePushSubscription(subscription.endpoint);

                console.log("[PUSH] Removed expired subscription.");
                return;
            }

            console.error("[PUSH] Developer notification failed:", error);
        }
    }));
}