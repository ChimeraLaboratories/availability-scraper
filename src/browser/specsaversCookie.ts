import type {
    BrowserContext,
} from "playwright";

import {
    appConfig,
} from "../config/app.js";

const SPECSAVERS_DOMAIN =
    "specsavers.co.uk";

export async function installSpecsaversCookie(
    context: BrowserContext,
): Promise<void> {
    await context.addCookies([
        {
            name: "cf_clearance",
            value:
            appConfig.specsaversCookie,
            domain:
            SPECSAVERS_DOMAIN,
            path: "/",
            secure: true,
            httpOnly: true,
            sameSite: "None",
        },
    ]);
}