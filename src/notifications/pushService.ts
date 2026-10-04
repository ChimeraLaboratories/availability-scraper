import webpush from "web-push";
import {getWebPushConfig} from "../config/webPush.js";

let configured = false;

function configureWebPush() {
    if (configured) {
        return;
    }

    const config = getWebPushConfig();

    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);

    configured = true;
}

export function getWebPushConfigPublicKey(): string {
    return getWebPushConfig().publicKey;
}

export async function sendPushNotification(subscription: webpush.PushSubscription, title: string, body: string): Promise<webpush.SendResult> {
    configureWebPush();

    const payload = JSON.stringify({ title, body});

    return webpush.sendNotification(subscription, payload);
}