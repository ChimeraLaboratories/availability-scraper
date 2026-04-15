import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
    openBrowserSession,
    getBrowserStatus,
    fetchAvailabilityInBrowser,
    filterAvailability,
} from "./browserClient.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/open-browser", async (req, res) => {
    try {
        const result = await openBrowserSession();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message || "Unknown error",
        });
    }
});

app.get("/api/browser-status", async (req, res) => {
    try {
        const result = await getBrowserStatus();
        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: error.message || "Unknown error",
        });
    }
});

app.get("/api/dashboard", async (req, res) => {
    try {
        const storeNumber = process.env.SPECSAVERS_STORE || "8";
        const startDate = new Date().toISOString().slice(0, 10);
        const lineOfBusiness = process.env.SPECSAVERS_LINE_OF_BUSINESS || "OPTICAL";

        const categories = [
            {
                key: "adultEyeTest",
                label: "Adult Eye Test",
                slotType: "ADULT_EYE_TEST",
                filters: {},
            },
            {
                key: "childEyeTestWeekend",
                label: "Child Eye Test Weekend",
                slotType: "CHILD_EYE_TEST",
                filters: { weekend: true },
            },
        ];

        const results = [];

        for (const category of categories) {
            try {
                const raw = await fetchAvailabilityInBrowser({
                    storeNumber,
                    slotType: category.slotType,
                    startDate,
                    maxNumberOfDays: 42,
                    lineOfBusiness,
                });

                const filtered = filterAvailability(raw, category.filters);

                const firstDay = filtered[0] || null;
                const firstSlot = firstDay?.appointmentSlots?.[0] || null;

                results.push({
                    key: category.key,
                    label: category.label,
                    slotType: category.slotType,
                    nextAvailableDate: firstDay?.date || null,
                    nextAvailableTime: firstSlot?.startTime || null,
                    totalDays: filtered.length,
                    totalSlots: filtered.reduce((sum, day) => sum + day.appointmentSlots.length, 0),
                    days: filtered,
                });
            } catch (error) {
                results.push({
                    key: category.key,
                    label: category.label,
                    slotType: category.slotType,
                    error: error.message || "Unknown error",
                    nextAvailableDate: null,
                    nextAvailableTime: null,
                    totalDays: 0,
                    totalSlots: 0,
                    days: [],
                });
            }
        }

        const nextAvailableOverall = results
            .filter((r) => r.nextAvailableDate && r.nextAvailableTime)
            .sort((a, b) => {
                const aValue = `${a.nextAvailableDate}T${a.nextAvailableTime}`;
                const bValue = `${b.nextAvailableDate}T${b.nextAvailableTime}`;
                return aValue.localeCompare(bValue);
            })[0] || null;

        res.json({
            storeNumber,
            startDate,
            nextAvailableOverall,
            categories: results,
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
    console.log("Open the browser session first at /api/open-browser");
});