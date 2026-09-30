import {
    Router,
} from "express";

import {
    verifyAdminTotp,
} from "../auth/totpService.js";

import {
    createAdminSession,
    deleteAdminSession,
    isAdminSessionValid,
} from "../auth/adminSessionService.js";

import {
    clearAdminCookie,
    getAdminCookie,
    setAdminCookie,
} from "../auth/adminCookie.js";

import {
    adminRateLimiter,
} from "../middleware/adminRateLimiter.js";

import {
    requireAdminSession,
} from "../middleware/requireAdminSession.js";

import {
    writeAdminAuditEvent,
} from "../services/adminAuditService.js";

import {
    appConfig,
} from "../config/app.js";

export const adminAuthRouter =
    Router();

adminAuthRouter.post(
    "/auth",
    adminRateLimiter,
    (req, res) => {
        const code =
            typeof req.body.code ===
            "string"
                ? req.body.code
                : "";

        if (
            !verifyAdminTotp(
                code,
            )
        ) {
            void writeAdminAuditEvent({
                event:
                    "ADMIN_AUTH_FAILED",
                ip:
                    req.ip,
            });

            return res
                .status(401)
                .json({
                    ok: false,
                    error:
                        "Invalid authentication code.",
                });
        }

        const token =
            createAdminSession();

        setAdminCookie(
            res,
            token,
        );

        void writeAdminAuditEvent({
            event:
                "ADMIN_AUTH_SUCCESS",
            ip:
                req.ip,
        });

        return res.json({
            ok: true,
        });
    },
);

adminAuthRouter.get(
    "/session",
    (req, res) => {
        const token =
            getAdminCookie(req);

        if (
            !isAdminSessionValid(
                token,
            )
        ) {
            return res
                .status(401)
                .json({
                    ok: false,
                    authenticated:
                        false,
                });
        }

        return res.json({
            ok: true,
            authenticated: true,
        });
    },
);

adminAuthRouter.get(
    "/diagnostics",
    requireAdminSession,
    (_req, res) => {
        return res.json({
            ok: true,
            browserDebugEnabled:
                appConfig.enableBrowserDebug,
            totpConfigured:
                Boolean(
                    appConfig.adminTotpSecret,
                ),
            sessionStorage:
                "memory",
            serverTime:
                new Date().toISOString(),
        });
    },
);

adminAuthRouter.post(
    "/logout",
    (req, res) => {
        const token =
            getAdminCookie(req);

        deleteAdminSession(
            token,
        );

        void writeAdminAuditEvent({
            event:
                "ADMIN_LOGOUT",
            ip:
                req.ip,
        });

        clearAdminCookie(
            res,
        );

        return res.json({
            ok: true,
        });
    },
);
