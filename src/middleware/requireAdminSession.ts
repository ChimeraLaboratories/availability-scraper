import type {
    NextFunction,
    Request,
    Response,
} from "express";

import {
    getAdminCookie,
} from "../auth/adminCookie.js";

import {
    isAdminSessionValid,
} from "../auth/adminSessionService.js";

export function requireAdminSession(
    req: Request,
    res: Response,
    next: NextFunction,
) {
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
                error:
                    "Authentication required.",
            });
    }

    next();
}