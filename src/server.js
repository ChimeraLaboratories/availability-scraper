import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import {
    ensureBrowser,
    getExistingBrowser,
    openBrowserSession,
    closeBrowser,
    saveBrowserState,
    getBrowserStatus,
} from "./browserClient.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 3001);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/open-browser", async (req, res) => {
    try {
        const page = await ensureBrowser();

        if (page.url() === "about:blank") {
            await page.bringToFront();
        }

        res.json({
            ok: true,
            message: "Browser opened. Use noVNC to navigate manually.",
            url: page.url(),
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: String(error),
        });
    }
});

app.get("/api/continue", async (req, res) => {
    try {
        const page = await ensureBrowser();

        await page.bringToFront();
        await page.waitForLoadState("domcontentloaded");

        res.json({
            ok: true,
            url: page.url(),
            message: "Session is ready. Continue with search from the existing verified browser.",
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: String(error),
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

                results.push({
                    key: category.key,
                    label: category.label,
                    lineOfBusiness: category.lineOfBusiness,
                    slotType: category.slotType,
                    nextAvailableDate: firstDay?.date || null,
                    nextAvailableTime: firstSlot?.startTime || null,
                    nextAvailableLabel:
                        firstDay?.date && firstSlot?.startTime
                            ? formatDateTime(firstDay.date, firstSlot.startTime)
                            : null,
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
                    nextAvailableDate: null,
                    nextAvailableTime: null,
                    nextAvailableLabel: null,
                    totalDays: 0,
                    totalSlots: 0,
                    days: [],
                });
            }
        }

        const nextAvailableOverall =
            results
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

app.post("/api/save-browser-state", async (req, res) => {
    try {
        const result = await saveBrowserState();
        res.json(result);
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: String(error),
        });
    }
});

app.get("/api/search-location", async (req, res) => {
    try {
        const location = String(req.query.location || "").trim();
        if (!location) {
            return res.status(400).json({ ok: false, error: "Missing location" });
        }

        const page = await ensureBrowser();

        await page.bringToFront();
        await page.waitForLoadState("domcontentloaded");

        // You may need to adjust selectors for the live page
        const input = page.locator('input[type="text"]').first();
        await input.waitFor({ timeout: 15000 });
        await input.fill(location);
        await input.press("Enter");

        await page.waitForLoadState("domcontentloaded");

        res.json({
            ok: true,
            message: `Search submitted for ${location}`,
            url: page.url(),
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: String(error),
        });
    }
});

app.get("/api/session-status", async (req, res) => {
    try {
        const result = await getBrowserStatus();
        res.json(result);
    } catch (error) {
        res.status(500).json({ ok: false, error: String(error) });
    }
});

app.get("/api/go-to-site", async (req, res) => {
    try {
        const page = await ensureBrowser();

        await page.bringToFront();
        await page.goto("https://www.specsavers.co.uk/book/location", {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        });

        res.json({
            ok: true,
            url: page.url(),
            message: "Navigate manually in noVNC and complete verification.",
        });
    } catch (error) {
        res.status(500).json({ ok: false, error: String(error) });
    }
});

app.get("/api/debug-cookies", async (req, res) => {
    try {
        const existing = getExistingBrowser();
        if (!existing?.page) {
            return res.status(400).json({ ok: false, error: "Browser not open" });
        }

        const cookies = await existing.context.cookies();

        res.json({
            ok: true,
            count: cookies.length,
            cookies: cookies.map((c) => ({
                name: c.name,
                domain: c.domain,
                path: c.path,
                expires: c.expires,
                httpOnly: c.httpOnly,
                secure: c.secure,
            })),
        });
    } catch (error) {
        res.status(500).json({
            ok: false,
            error: String(error),
        });
    }
});

function isWeekend(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`);
    const day = date.getDay();
    return day === 0 || day === 6;
}

function filterAvailability(days = [], filters = {}) {
    return (days || [])
        .map((day) => {
            let appointmentSlots = Array.isArray(day.appointmentSlots)
                ? [...day.appointmentSlots]
                : [];

            if (filters.weekendsOnly && !isWeekend(day.date)) {
                appointmentSlots = [];
            }

            if (filters.afterTime) {
                appointmentSlots = appointmentSlots.filter(
                    (slot) => slot.startTime >= filters.afterTime
                );
            }

            return {
                ...day,
                appointmentSlots,
            };
        })
        .filter((day) => day.appointmentSlots.length > 0);
}

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