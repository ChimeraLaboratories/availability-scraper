import crypto from "node:crypto";

const SESSION_TTL_MS =
    8 * 60 * 60 * 1000;

interface AdminSession {
    expiresAt: number;
}

const sessions =
    new Map<string, AdminSession>();

export function createAdminSession() {
    const token =
        crypto.randomBytes(32)
            .toString("base64url");

    sessions.set(token, {
        expiresAt:
            Date.now() +
            SESSION_TTL_MS,
    });

    return token;
}

export function isAdminSessionValid(
    token: string | undefined,
): boolean {
    if (!token) {
        return false;
    }

    const session =
        sessions.get(token);

    if (!session) {
        return false;
    }

    if (
        session.expiresAt <
        Date.now()
    ) {
        sessions.delete(token);

        return false;
    }

    return true;
}

export function deleteAdminSession(
    token: string | undefined,
) {
    if (token) {
        sessions.delete(token);
    }
}