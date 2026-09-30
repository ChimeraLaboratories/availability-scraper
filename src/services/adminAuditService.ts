import fs from "node:fs/promises";
import path from "node:path";

const AUDIT_FILE =
    path.resolve(
        process.cwd(),
        "data/admin-audit.log",
    );

interface AdminAuditEvent {
    event: string;
    timestamp?: string;
    ip?: string;
    details?: Record<
        string,
        unknown
    >;
}

export async function writeAdminAuditEvent(
    event: AdminAuditEvent,
): Promise<void> {
    const record = {
        timestamp:
            event.timestamp ??
            new Date().toISOString(),

        event:
        event.event,

        ip:
            event.ip ?? null,

        details:
            event.details ?? {},
    };

    await fs.mkdir(
        path.dirname(
            AUDIT_FILE,
        ),
        {
            recursive: true,
        },
    );

    await fs.appendFile(
        AUDIT_FILE,
        `${JSON.stringify(record)}\n`,
        "utf8",
    );
}