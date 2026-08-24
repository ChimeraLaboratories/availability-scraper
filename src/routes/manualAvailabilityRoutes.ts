import {
    Router,
} from "express";

import {
    getManualCategoriesWithValues,
    updateManualAvailability,
} from "../services/manualAvailabilityService.js";

import {
    asyncRoute,
} from "../utils/asyncRoute.js";

export const manualAvailabilityRouter =
    Router();

manualAvailabilityRouter.get(
    "/manual-availability",
    asyncRoute(async (_req, res) => {
        const categories =
            await getManualCategoriesWithValues();

        return res.json({
            ok: true,
            categories,
        });
    }),
);

manualAvailabilityRouter.put(
    "/manual-availability/:key",
    asyncRoute(async (req, res) => {
        const rawKey = req.params.key;

        if (typeof rawKey !== "string") {
            return res.status(400).json({
                ok: false,
                error: "Invalid category key.",
            });
        }

        const key = rawKey.trim();

        const date =
            typeof req.body.nextAvailableDate ===
            "string" &&
            req.body.nextAvailableDate
                .trim()
                .length > 0
                ? req.body
                    .nextAvailableDate
                    .trim()
                : null;

        const time =
            typeof req.body.nextAvailableTime ===
            "string" &&
            req.body.nextAvailableTime
                .trim()
                .length > 0
                ? req.body
                    .nextAvailableTime
                    .trim()
                : null;

        const saved =
            await updateManualAvailability(
                key,
                date,
                time,
            );

        return res.json({
            ok: true,
            category: saved,
        });
    }),
);