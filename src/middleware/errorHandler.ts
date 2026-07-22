import type {
    ErrorRequestHandler,
} from "express";

import {
    getErrorMessage,
} from "../utils/errors.js";

export const errorHandler: ErrorRequestHandler = (
    error,
    _req,
    res,
    _next,
) => {
    console.error(error);

    if (res.headersSent) {
        return;
    }

    res.status(500).json({
        ok: false,
        error: getErrorMessage(error),
    });
};