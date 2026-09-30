import * as OTPAuth from "otpauth";
import qrcode from "qrcode-terminal";

const secret = new OTPAuth.Secret({
        size: 20,
});

const totp = new OTPAuth.TOTP({
        issuer: "ChimeraLabs",
        label: "Availability Admin",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret,
    });

const uri = totp.toString();

console.log("");
console.log("Availability Admin TOTP setup",);
console.log("==============================",);
qrcode.generate(uri, { small: true});
console.log("");
console.log("Secret:",);
console.log(secret.base32,);
console.log("");
console.log("Authenticator URI:",);
console.log(totp.toString(),);
console.log("");
console.log("Store the secret as:",);
console.log(`ADMIN_TOTP_SECRET=${secret.base32}`,);
console.log("");
console.log("Scan the QR code with Step Two or equivalent MFA App.")
console.log("Do not commit or share this secret/QR code.",);
console.log("");