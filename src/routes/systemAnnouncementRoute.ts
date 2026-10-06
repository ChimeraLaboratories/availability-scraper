import {Router} from "express";
import {asyncRoute} from "../utils/asyncRoute.js";
import {getActiveSystemAnnouncements} from "../services/systemAnnouncementService.js";

export const systemAnnouncementRouter = Router();

systemAnnouncementRouter.get("/system-announcements", asyncRoute(async (req, res) => {
    const storeNumber = typeof req.query.storeNumber === "string" ? req.query.storeNumber.trim() : undefined;

    const announcements = await getActiveSystemAnnouncements(storeNumber);

    return res.json({
        ok: true,
        announcements
    });

}));