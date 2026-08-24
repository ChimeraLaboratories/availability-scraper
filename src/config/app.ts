import dotenv from "dotenv";
import path from "node:path";

dotenv.config();

function parsePort(
    value: string | undefined,
): number {
    const port = Number(
        value ?? 3001,
    );

    if (
        !Number.isInteger(port) ||
        port < 1 ||
        port > 65535
    ) {
        throw new Error(
            `Invalid PORT value: ${value}`,
        );
    }

    return port;
}

function requireEnvironmentVariable(
    name: string,
    value: string | undefined,
): string {
    const cleanedValue = value?.trim();

    if (!cleanedValue) {
        throw new Error(
            `Missing required environment variable: ${name}`,
        );
    }

    return cleanedValue;
}

const publicDirectory = path.resolve(
    process.cwd(),
    "src/public",
);

export const appConfig = {
    host:
        process.env.HOST ??
        "0.0.0.0",

    port: parsePort(
        process.env.PORT,
    ),

    specsaversStore:
        requireEnvironmentVariable(
            "SPECSAVERS_STORE",
            process.env.SPECSAVERS_STORE,
        ),

    specsaversAudiologyStore:
    requireEnvironmentVariable("SPECSAVERS_AUDIOLOGY_STORE_NUMBER", process.env.SPECSAVERS_AUDIOLOGY_STORE_NUMBER),

    specsaversCookie:
        requireEnvironmentVariable(
            "SPECSAVERS_COOKIE",
            process.env.SPECSAVERS_COOKIE,
        ),

    publicDirectory,

    indexFile: path.join(
        publicDirectory,
        "index.html",
    ),
} as const;