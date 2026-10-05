import {Router} from "express";

import {appConfig} from "../config/app.js";

import {getDashboardAvailability} from "../services/dashboardService.js";

import {asyncRoute} from "../utils/asyncRoute.js";
import {recordDateRollover} from "../notifications/dashboardAlertService.js";
import {sendDeveloperNotification} from "../notifications/developerNotificationService.js";

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

dashboardRouter.post(
    "/dashboard/date-rollover", asyncRoute(async (req, res) => {
        const date = typeof req.body?.date === "string" ? req.body.date : null;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({error: "Valid date is required"});
        }

        const {shouldAlert} = recordDateRollover(date);

        if (shouldAlert) {
            await sendDeveloperNotification(
                "⚠️ Dashboard Date Rollover",
                `Store ${appConfig.specsaversStore} • Dashboard required automatic date correction to ${date}.`
            );
        }

        return res.json({success:true, alerted: shouldAlert});
    }));