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

export const app = express();

app.use(express.json());

app.use(
    express.static(
        appConfig.publicDirectory,
    ),
);

app.use("/api", browserRouter);
app.use("/api", dashboardRouter);
app.use("/api", manualAvailabilityRouter);

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