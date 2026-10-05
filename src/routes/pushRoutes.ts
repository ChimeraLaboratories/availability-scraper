import type webpush from "web-push";
import {Router} from "express";
import {getWebPushConfigPublicKey, sendPushNotification} from "../notifications/pushService.js";
import {
    getPushSubscriptionCount,
    getPushSubscriptions,
    removePushSubscription,
    savePushSubscription
} from "../notifications/pushStore.js";
import {requireAdminSession} from "../middleware/requireAdminSession.js";

const router = Router();

router.get("/public-key", (_req, res) => {
    res.json({ publicKey: getWebPushConfigPublicKey() });
});

router.post("/subscribe", requireAdminSession, async (req, res) => {
    const subscription = req.body as webpush.PushSubscription | undefined;

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
        res.status(400).json({error: "Invalid push subscription"});
        return;
    }

    await savePushSubscription(subscription);

    console.log(`[PUSH] Subscription registered (${await getPushSubscriptionCount()}) total`);

    res.status(201).json({ success: true });
});

router.post("/test", requireAdminSession, async (_req, res) => {
    const subscriptions = await getPushSubscriptions();

    if (subscriptions.length === 0) {
        res.status(400).json({ error: "No push subscriptions are registered." });
        return;
    }

    await Promise.all(subscriptions.map(async (subscription) => {
        try {
            await sendPushNotification(
                subscription,
                "🔔 Availability Test",
                "Notifications are working correctly on this device.",
            );
        } catch (error: unknown) {
            const statusCode = typeof error === "object" && error !== null && "statusCode" in error ? error.statusCode : undefined;

            if (statusCode === 404 || statusCode === 410) {
                await removePushSubscription(subscription.endpoint);

                console.log("[PUSH] Removed expired subscription.");
                return;
            }

            throw error;
        }
    }
    )
    );

    res.json({ success: true, sent: subscriptions.length });
});

export default router;