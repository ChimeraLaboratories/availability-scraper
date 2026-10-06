import { Router } from "express";

import { requireAdminSession } from "../middleware/requireAdminSession.js";

import {
    createSystemAnnouncement, deleteSystemAnnouncement,
    getActiveSystemAnnouncements,
    updateSystemAnnouncement,
} from "../services/systemAnnouncementService.js";

import { asyncRoute } from "../utils/asyncRoute.js";

export const systemAnnouncementRouter = Router();

systemAnnouncementRouter.get(
    "/system-announcements",
    asyncRoute(async (req, res) => {
        const storeNumber =
            typeof req.query.storeNumber === "string"
                ? req.query.storeNumber.trim()
                : undefined;

        const announcements =
            await getActiveSystemAnnouncements(
                storeNumber,
            );

        return res.json({
            ok: true,
            announcements,
        });
    }),
);

systemAnnouncementRouter.post(
    "/admin/system-announcements",
    requireAdminSession,
    asyncRoute(async (req, res) => {
        const message =
            typeof req.body.message === "string"
                ? req.body.message.trim()
                : "";

        const scope =
            req.body.scope;

        const storeNumber =
            typeof req.body.storeNumber === "string"
                ? req.body.storeNumber.trim()
                : null;

        const enabled =
            req.body.enabled === true;

        const startsAt =
            typeof req.body.startsAt === "string"
                ? req.body.startsAt
                : null;

        const endsAt =
            typeof req.body.endsAt === "string"
                ? req.body.endsAt
                : null;

        if (!message) {
            return res.status(400).json({
                ok: false,
                error: "Message is required.",
            });
        }

        if (
            scope !== "GLOBAL" &&
            scope !== "STORE"
        ) {
            return res.status(400).json({
                ok: false,
                error: "Scope must be GLOBAL or STORE.",
            });
        }

        if (
            scope === "STORE" &&
            !storeNumber
        ) {
            return res.status(400).json({
                ok: false,
                error: "Store number is required for STORE announcements.",
            });
        }

        if (
            startsAt &&
            Number.isNaN(
                Date.parse(startsAt),
            )
        ) {
            return res.status(400).json({
                ok: false,
                error: "Start date is invalid.",
            });
        }

        if (
            endsAt &&
            Number.isNaN(
                Date.parse(endsAt),
            )
        ) {
            return res.status(400).json({
                ok: false,
                error: "End date is invalid.",
            });
        }

        if (
            startsAt &&
            endsAt &&
            Date.parse(endsAt) <=
            Date.parse(startsAt)
        ) {
            return res.status(400).json({
                ok: false,
                error: "End date must be after start date.",
            });
        }

        const announcement =
            await createSystemAnnouncement({
                message,
                scope,
                storeNumber:
                    scope === "STORE"
                        ? storeNumber
                        : null,
                enabled,
                startsAt,
                endsAt,
            });

        return res.status(201).json({
            ok: true,
            announcement,
        });
    }),
);

systemAnnouncementRouter.put(
    "/admin/system-announcements/:id",
    requireAdminSession,
    asyncRoute(async (req, res) => {
        const id =
            req.params.id;

        if (typeof id !== "string") {
            return res.status(400).json({
                ok: false,
                error: "Invalid announcement ID.",
            });
        }

        const updates = {
            ...(typeof req.body.message === "string" && {
                message: req.body.message.trim(),
            }),

            ...(
                (
                    req.body.scope === "GLOBAL" ||
                    req.body.scope === "STORE"
                ) && {
                    scope: req.body.scope,
                }
            ),

            ...(
                (
                    typeof req.body.storeNumber === "string" ||
                    req.body.storeNumber === null
                ) && {
                    storeNumber:
                        typeof req.body.storeNumber === "string"
                            ? req.body.storeNumber.trim()
                            : null,
                }
            ),

            ...(typeof req.body.enabled === "boolean" && {
                enabled: req.body.enabled,
            }),

            ...(
                (
                    typeof req.body.startsAt === "string" ||
                    req.body.startsAt === null
                ) && {
                    startsAt: req.body.startsAt,
                }
            ),

            ...(
                (
                    typeof req.body.endsAt === "string" ||
                    req.body.endsAt === null
                ) && {
                    endsAt: req.body.endsAt,
                }
            ),
        };

        if (
            "message" in updates &&
            !updates.message
        ) {
            return res.status(400).json({
                ok: false,
                error: "Message is required.",
            });
        }

        if (
            "startsAt" in updates &&
            updates.startsAt &&
            Number.isNaN(
                Date.parse(updates.startsAt),
            )
        ) {
            return res.status(400).json({
                ok: false,
                error: "Start date is invalid.",
            });
        }

        if (
            "endsAt" in updates &&
            updates.endsAt &&
            Number.isNaN(
                Date.parse(updates.endsAt),
            )
        ) {
            return res.status(400).json({
                ok: false,
                error: "End date is invalid.",
            });
        }

        let announcement;

        try {
            announcement =
                await updateSystemAnnouncement(
                    id,
                    updates,
                );
        } catch (error: unknown) {
            if (
                error instanceof Error &&
                (
                    error.message ===
                    "Store number is required for STORE announcements." ||
                    error.message ===
                    "End date must be after start date."
                )
            ) {
                return res.status(400).json({
                    ok: false,
                    error: error.message,
                });
            }

            throw error;
        }

        if (!announcement) {
            return res.status(404).json({
                ok: false,
                error: "Announcement not found.",
            });
        }

        return res.json({
            ok: true,
            announcement,
        });
    }),
);

systemAnnouncementRouter.delete(
    "/admin/system-announcements/:id",
    requireAdminSession,
    asyncRoute(async (req, res) => {
        const id =
            req.params.id;

        if (typeof id !== "string") {
            return res.status(400).json({
                ok: false,
                error: "Invalid announcement ID.",
            });
        }

        const deleted =
            await deleteSystemAnnouncement(
                id,
            );

        if (!deleted) {
            return res.status(404).json({
                ok: false,
                error: "Announcement not found.",
            });
        }

        return res.json({
            ok: true,
        });
    }),
);