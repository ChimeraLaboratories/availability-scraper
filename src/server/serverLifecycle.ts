import type {
    Server,
} from "node:http";

type LifecycleOptions = {
    server: Server;
    shutdownTimeoutMs?: number;
};

export function registerServerLifecycle({
                                            server,
                                            shutdownTimeoutMs = 10000,
                                        }: LifecycleOptions): void {
    let isShuttingDown = false;

    const shutdown = (
        signal: string,
    ): void => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;

        console.log(
            `Received ${signal}, shutting down...`,
        );

        const forceShutdownTimer =
            setTimeout(() => {
                console.error(
                    "Graceful shutdown timed out",
                );

                process.exit(1);
            }, shutdownTimeoutMs);

        forceShutdownTimer.unref();

        server.close((error) => {
            clearTimeout(
                forceShutdownTimer,
            );

            if (error) {
                console.error(
                    "Failed to close HTTP server:",
                    error,
                );

                process.exit(1);
            }

            console.log(
                "HTTP server closed",
            );

            process.exit(0);
        });
    };

    server.on("error", (error) => {
        console.error(
            "HTTP server error:",
            error,
        );
    });

    server.on("close", () => {
        console.log(
            "HTTP server closed",
        );
    });

    process.once("SIGINT", () => {
        shutdown("SIGINT");
    });

    process.once("SIGTERM", () => {
        shutdown("SIGTERM");
    });

    process.on(
        "uncaughtException",
        (error) => {
            console.error(
                "Uncaught exception:",
                error,
            );

            shutdown(
                "uncaughtException",
            );
        },
    );

    process.on(
        "unhandledRejection",
        (reason) => {
            console.error(
                "Unhandled rejection:",
                reason,
            );

            shutdown(
                "unhandledRejection",
            );
        },
    );
}