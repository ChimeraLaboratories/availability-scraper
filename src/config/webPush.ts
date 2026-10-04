interface WebPushConfig {
    publicKey: string;
    privateKey: string;
    subject: string;
}

function requireEnv(name: string): string {
    const value = process.env[name]?.trim();

    if(!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

export function getWebPushConfig(): WebPushConfig {
    return {
        publicKey: requireEnv("VAPID_PUBLIC_KEY"),
        privateKey: requireEnv("VAPID_PRIVATE_KEY"),
        subject: requireEnv("VAPID_SUBJECT"),
    };
}