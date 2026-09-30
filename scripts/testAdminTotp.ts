import * as OTPAuth from "otpauth";

import {
    appConfig,
} from "../src/config/app.js";

import {
    verifyAdminTotp,
} from "../src/auth/totpService.js";

const code =
    process.argv[2];

if (!code) {
    console.error(
        "Usage: npm run admin:test -- 123456",
    );

    process.exit(1);
}

if (!appConfig.adminTotpSecret) {
    console.error(
        "ADMIN_TOTP_SECRET is not loaded.",
    );

    process.exit(1);
}

const totp =
    new OTPAuth.TOTP({
        issuer: "ChimeraLabs",
        label: "Availability Admin",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret:
        appConfig.adminTotpSecret,
    });

console.log(
    "Server expects:",
    totp.generate(),
);

console.log(
    "You entered:",
    code,
);

console.log(
    verifyAdminTotp(code)
        ? "TOTP code is valid."
        : "TOTP code is invalid.",
);