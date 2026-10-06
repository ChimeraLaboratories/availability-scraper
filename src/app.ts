import express from "express";

import {
    appConfig,
} from "./config/app.js";

import {
    browserRouter,
} from "./routes/browserRoutes.js";

import {
    dashboardRouter,
} from "./routes/dashboardRoutes.js";

import {
    notFoundHandler,
} from "./middleware/notFoundHandler.js";

import {
    errorHandler,
} from "./middleware/errorHandler.js";
import {manualAvailabilityRouter} from "./routes/manualAvailabilityRoutes.js";
import {adminAuthRouter} from "./auth/adminAuthRoutes.js";
import {requireAdminSession} from "./middleware/requireAdminSession.js";
import pushRoutes from "./routes/pushRoutes.js";
import {systemAnnouncementRouter} from "./routes/systemAnnouncementRoutes.js";

export const app = express();

app.use(express.json());

app.use(
    express.static(
        appConfig.publicDirectory,
    ),
);

app.use("/api", dashboardRouter);
app.use("/api/admin", adminAuthRouter);
app.use("/api", manualAvailabilityRouter);
app.use("/api", systemAnnouncementRouter);
app.use("/api/push", pushRoutes);
app.use("/api", requireAdminSession, browserRouter);

app.use("/api", notFoundHandler);

app.get(
    "/{*path}",
    (_req, res) => {
        res.sendFile(
            appConfig.indexFile,
        );
    },
);

app.use(errorHandler);