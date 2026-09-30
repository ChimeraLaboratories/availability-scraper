import * as OTPAuth from "otpauth";

import {appConfig} from "../config/app.js";

function getAdminTotp(): OTPAuth.TOTP {
    const secret = appConfig.adminTotpSecret;

    if (!secret) {
        throw new Error("Admin TOTP authentication is not configured.");
    }

    return new OTPAuth.TOTP({
        issuer: "ChimeraLabs",
        label: "Availability Admin",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret
    });
}

export function verifyAdminTotp(
    code: string,
): boolean {
    const cleanedCode =
        code.trim();

    if (
        !/^\d{6}$/.test(
            cleanedCode,
        )
    ) {
        return false;
    }

    const totp =
        getAdminTotp();

    const delta =
        totp.validate({
            token: cleanedCode,
            window: 1,
        });

    console.log(
        "TOTP validation delta:",
        delta,
    );

    return delta !== null;
}