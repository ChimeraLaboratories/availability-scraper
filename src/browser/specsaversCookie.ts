import type {
    BrowserContext,
} from "playwright";

import {
    appConfig,
} from "../config/app.js";

function extractCookieValue(
    configuredValue: string,
): string {
    let value =
        configuredValue.trim();

    if (
        value.startsWith(
            "cf_clearance=",
        )
    ) {
        value = value.slice(
            "cf_clearance=".length,
        );
    }

    value =
        value.split(";")[0]
            ?.trim() ?? "";

    if (
        (value.startsWith('"') &&
            value.endsWith('"')) ||
        (value.startsWith("'") &&
            value.endsWith("'"))
    ) {
        value = value.slice(
            1,
            -1,
        );
    }

    if (!value) {
        throw new Error(
            "SPECSAVERS_COOKIE contains no cf_clearance value.",
        );
    }

    return value;
}

export async function installSpecsaversCookie(
    context: BrowserContext,
): Promise<void> {
    const configuredValue =
        appConfig.specsaversCookie;

    if (!configuredValue) {
        console.log(
            "SPECSAVERS_COOKIE not configured; using existing browser session.",
        );

        return;
    }

    const value =
        extractCookieValue(
            configuredValue,
        );

    console.log(
        "Installing Specsavers cf_clearance cookie...",
    );

    await context.addCookies([
        {
            name: "cf_clearance",
            value,
            url: "https://www.specsavers.co.uk/",
        },
    ]);

    console.log(
        "Specsavers cf_clearance cookie installed.",
    );
}