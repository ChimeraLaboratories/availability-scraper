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

import {
    requireAdminSession,
} from "../middleware/requireAdminSession.js";

import {
    writeAdminAuditEvent,
} from "../services/adminAuditService.js";

export const manualAvailabilityRouter =
    Router();

function isValidDate(
    value: string | null,
): boolean {
    if (value === null) {
        return true;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return false;
    }

    const parsed =
        new Date(`${value}T00:00:00Z`);

    return (
        !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === value
    );
}

function isValidTime(
    value: string | null,
): boolean {
    return (
        value === null ||
        /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
    );
}

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
    requireAdminSession,
    asyncRoute(async (req, res) => {
        const rawKey =
            req.params.key;

        if (
            typeof rawKey !==
            "string"
        ) {
            return res
                .status(400)
                .json({
                    ok: false,
                    error:
                        "Invalid category key.",
                });
        }

        const key =
            rawKey.trim();

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

        if (!isValidDate(date)) {
            return res
                .status(400)
                .json({
                    ok: false,
                    error:
                        "nextAvailableDate must use YYYY-MM-DD.",
                });
        }

        if (!isValidTime(time)) {
            return res
                .status(400)
                .json({
                    ok: false,
                    error:
                        "nextAvailableTime must use HH:mm.",
                });
        }

        const saved =
            await updateManualAvailability(
                key,
                date,
                time,
            );

        void writeAdminAuditEvent({
            event:
                "MANUAL_AVAILABILITY_UPDATED",
            ip: req.ip,
            details: {
                key:
                    saved.key,
                label:
                    saved.label,
                nextAvailableDate:
                    saved.nextAvailableDate,
                nextAvailableTime:
                    saved.nextAvailableTime,
            },
        });

        return res.json({
            ok: true,
            category: saved,
        });
    }),
);
