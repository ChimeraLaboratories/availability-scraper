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

        const categories = [
            {
                key: "adultEyeTest",
                label: "Adult Eye Test",
                lineOfBusiness: "OPTICAL",
                slotType: "ADULT_EYE_TEST",
                filters: {},
            },
            {
                key: "childEyeTestWeekend",
                label: "Child Eye Test Weekend",
                lineOfBusiness: "OPTICAL",
                slotType: "CHILD_EYE_TEST",
                filters: { weekendsOnly: true },
            },
            {
                key: "childEyeTestAfter4",
                label: "Child Eye Test After 4pm",
                lineOfBusiness: "OPTICAL",
                slotType: "CHILD_EYE_TEST",
                filters: { afterTime: "16:00" },
            },
            {
                key: "contactLensCheck",
                label: "Contact Lens Check",
                lineOfBusiness: "OPTICAL",
                slotType: "CONTACT_LENS_AFTERCARE_CHECK_UP",
                filters: {},
            },
            {
                key: "contactLensFit",
                label: "Contact Lens Fit",
                lineOfBusiness: "OPTICAL",
                slotType: "CONTACT_LENS_ASSESSMENT_OR_TRIAL",
                filters: {},
            },
            {
                key: "earWaxRemoval",
                label: "Ear Wax Removal",
                lineOfBusiness: "AUDIOLOGY",
                slotType: "EAR_WAX_REMOVAL",
                filters: {},
            },
            {
                key: "otherHearingAppointment",
                label: "Hearing Appointment (Test/Repair/etc)",
                lineOfBusiness: "AUDIOLOGY",
                slotType: "HEARING_AID_MAINTENANCE_OR_REPAIR",
                filters: {},
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
                    lineOfBusiness: category.lineOfBusiness,
                });

                const filtered = filterAvailability(raw, category.filters);

                const firstDay = filtered[0] || null;
                const firstSlot = firstDay?.appointmentSlots?.[0] || null;

                const formatted = formatDateTime(
                    firstDay?.date,
                    firstSlot?.startTime
                );

                results.push({
                    key: category.key,
                    label: category.label,
                    lineOfBusiness: category.lineOfBusiness,
                    slotType: category.slotType,
                    nextAvailable: formatted,
                    nextAvailableDate: firstDay?.date || null,
                    nextAvailableTime: firstSlot?.startTime || null,
                    totalDays: filtered.length,
                    totalSlots: filtered.reduce(
                        (sum, day) => sum + day.appointmentSlots.length,
                        0
                    ),
                    days: filtered,
                });
            } catch (error) {
                results.push({
                    key: category.key,
                    label: category.label,
                    lineOfBusiness: category.lineOfBusiness,
                    slotType: category.slotType,
                    error: error.message || "Unknown error",
                    nextAvailable: null,
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

function formatDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr) return null;

    const date = new Date(`${dateStr}T${timeStr}`);

    return date
        .toLocaleString("en-GB", {
            weekday: "long",
            day: "numeric",
            month: "long",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        })
        .replace(",", " at");
}

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log("Open the browser session first at /api/open-browser");
});