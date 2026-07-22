import type { Page } from "playwright";

import type {
    CookieHandlerResult,
} from "../types/browser.js";

import {
    getErrorMessage,
} from "../utils/errors.js";

export async function handleCookies(
    page: Page,
): Promise<CookieHandlerResult> {
    try {
        await page.waitForTimeout(1500);

        const acceptButton = page.getByRole(
            "button",
            {
                name: /accept( all)? cookies|accept all/i,
            },
        );

        if ((await acceptButton.count()) > 0) {
            await acceptButton.first().click({
                force: true,
                timeout: 5000,
            });

            console.log(
                "Cookies accepted via role selector",
            );

            return {
                ok: true,
                method: "role-selector",
            };
        }

        const clickedInDom =
            await page.evaluate(() => {
                const buttons = Array.from(
                    document.querySelectorAll<HTMLButtonElement>(
                        "button",
                    ),
                );

                const button = buttons.find(
                    (candidate) =>
                        /accept( all)? cookies|accept all/i.test(
                            (
                                candidate.innerText ||
                                candidate.textContent ||
                                ""
                            ).trim(),
                        ),
                );

                if (!button) {
                    return false;
                }

                button.click();

                return true;
            });

        if (clickedInDom) {
            console.log(
                "Cookies accepted via DOM fallback",
            );

            return {
                ok: true,
                method: "dom-fallback",
            };
        }

        console.log(
            "No cookie accept button found",
        );

        return {
            ok: false,
            method: "not-found",
        };
    } catch (error: unknown) {
        const message =
            getErrorMessage(error);

        console.log(
            "Cookie accept failed:",
            message,
        );

        return {
            ok: false,
            method: "error",
            error: message,
        };
    }
}