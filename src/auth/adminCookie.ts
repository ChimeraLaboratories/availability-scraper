import type {
    Request,
    Response,
} from "express";

const isProduction =
    process.env.NODE_ENV ===
    "production";

const COOKIE_NAME =
    isProduction
        ? "__Host-availability_admin"
        : "availability_admin";

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    path: "/",
};

export function setAdminCookie(
    res: Response,
    token: string,
) {
    res.cookie(
        COOKIE_NAME,
        token,
        {
            ...COOKIE_OPTIONS,

            maxAge:
                8 *
                60 *
                60 *
                1000,
        },
    );
}

export function clearAdminCookie(
    res: Response,
) {
    res.clearCookie(
        COOKIE_NAME,
        COOKIE_OPTIONS,
    );
}

export function getAdminCookie(
    req: Request,
): string | undefined {
    const cookieHeader =
        req.headers.cookie;

    if (!cookieHeader) {
        return undefined;
    }

    const cookies =
        Object.fromEntries(
            cookieHeader
                .split(";")
                .map((part) => {
                    const [
                        key,
                        ...rest
                    ] =
                        part
                            .trim()
                            .split("=");

                    return [
                        key,
                        rest.join("="),
                    ];
                }),
        );

    return cookies[
        COOKIE_NAME
        ];
}