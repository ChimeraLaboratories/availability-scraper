import {
    Router,
} from "express";

import {
    appConfig,
} from "../config/app.js";

import {
    getDashboardAvailability,
} from "../services/dashboardService.js";

import {
    asyncRoute,
} from "../utils/asyncRoute.js";

export const dashboardRouter = Router();

dashboardRouter.get(
    "/dashboard",
    asyncRoute(async (req, res) => {
        const startDate =
            typeof req.query.startDate ===
            "string"
                ? req.query.startDate
                : new Date()
                    .toISOString()
                    .slice(0, 10);

        const dashboard =
            await getDashboardAvailability(
                appConfig.specsaversStore,
                startDate,
            );

        return res.json(dashboard);
    }),
);