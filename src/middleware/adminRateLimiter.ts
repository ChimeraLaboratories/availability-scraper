import rateLimit from "express-rate-limit";

export const adminRateLimiter =
    rateLimit({
        windowMs: 5 * 60 * 1000,
        limit: 5,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            ok: false,
            error: "Too many authentication attempts. Please try again later.",
        },
    });