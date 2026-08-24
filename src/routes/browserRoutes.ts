import { Router } from "express";
import { getErrorMessage } from "../utils/errors.js";
import {searchLocation} from "../services/locationSearchService.js";
import {goToBookingSite} from "../services/siteNavigationService.js";
import {continueBrowserSession, openBrowserSession} from "../services/browserControlService.js";
import {getBrowserCookies} from "../services/browserDebugService.js";
import {persistBrowserState, readBrowserStatus} from "../services/browserStateService.js";

export const browserRouter = Router();

browserRouter.get(
    "/open-browser",
    async (_req, res) => {
        try {
            const result = await openBrowserSession();

            return res.json(result);
        } catch (error: unknown) {
            return res.status(500).json({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    },
);

browserRouter.get(
    "/continue",
    async (_req, res) => {
        try {
            const result = await continueBrowserSession();

            return res.json(result);
        } catch (error: unknown) {
            return res.status(500).json({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    },
);

browserRouter.get(
    "/browser-status",
    async (_req, res) => {
        try {
            const result =
                await readBrowserStatus();

            return res.json(result);
        } catch (error: unknown) {
            console.error(error);

            return res.status(500).json({
                error: getErrorMessage(error),
            });
        }
    },
);

browserRouter.post(
    "/save-browser-state",
    async (_req, res) => {
        try {
            const result = await persistBrowserState();

            if(!result.ok) {
                return res.status(400).json(result,);
            }

            return res.json(result);
        } catch (error: unknown) {
            return res.status(500).json({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    },
);

browserRouter.get(
    "/search-location",
    async (req, res) => {
        try {
            const location =
                typeof req.query.location === "string"
                    ? req.query.location.trim()
                    : "";

            if (!location) {
                return res.status(400).json({
                    ok: false,
                    error: "Missing location",
                });
            }

            const result = await searchLocation(location);

            return res.json(result);
        } catch (error: unknown) {
            return res.status(500).json({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    },
);

browserRouter.get(
    "/session-status",
    async (_req, res) => {
        try {
            const result =
                await readBrowserStatus();

            return res.json(result);
        } catch (error: unknown) {
            return res.status(500).json({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    },
);

browserRouter.get(
    "/go-to-site",
    async (_req, res) => {
        try {
            const result = await goToBookingSite();

            return res.json(result);
        } catch (error: unknown) {
            return res.status(500).json({
                ok: false,
                error: getErrorMessage(error),
            });
        }
    },
);

browserRouter.get(
    "/debug-cookies",
    async (_req, res) => {
        try {
            const result = await getBrowserCookies();

            return res.json(result);
        } catch (error: unknown) {
            const message = getErrorMessage(error);

            if (message === "Browser not open" || message === "Browser is not open") {
                return res.status(400).json({
                    ok: false,
                    error: message,
                });
            }

            return res.status(500).json({
                ok: false,
                error: message,
            });
        }
    },
);