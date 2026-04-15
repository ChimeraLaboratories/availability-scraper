import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { fetchAvailabilityInBrowser, filterAvailability } from "./browserClient.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/availability", async (req, res) => {
    try {
        const storeNumber = req.query.storeNumber || process.env.SPECSAVERS_STORE || "8";
        const slotType = req.query.slotType;
        const startDate = req.query.startDate;
        const maxNumberOfDays = Number(req.query.maxNumberOfDays || 42);
        const weekdaysOnly = req.query.weekdaysOnly === "true";
        const weekendsOnly = req.query.weekendsOnly === "true";
        const afterTime = req.query.afterTime || undefined;
        const beforeTime = req.query.beforeTime || undefined;

        if (!slotType || !startDate) {
            return res.status(400).json({
                error: "slotType and startDate are required",
            });
        }

        const raw = await fetchAvailabilityInBrowser({
            storeNumber,
            slotType,
            startDate,
            maxNumberOfDays,
            lineOfBusiness: process.env.SPECSAVERS_LINE_OF_BUSINESS || "OPTICAL",
        });

        const filtered = filterAvailability(raw, {
            weekdaysOnly,
            weekendsOnly,
            afterTime,
            beforeTime,
        });

        res.json({
            storeNumber,
            slotType,
            startDate,
            maxNumberOfDays,
            results: filtered,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message || "Unknown error",
        });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log("A browser window will open on first availability request.");
});