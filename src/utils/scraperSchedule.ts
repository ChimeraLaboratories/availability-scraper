interface ScraperScheduleStatus {
    active: boolean;
    currentTime: string;
    currentDay: string;
    startTime: string;
    stopTime: string;
    resumesAt: string | null;
}

const DEFAULT_TIMEZONE = "Europe/London";
const DEFAULT_START_TIME = "08:30";
const DEFAULT_NORMAL_STOP_TIME = "18:00";
const DEFAULT_THURSDAY_STOP_TIME = "19:30";

function getConfigValue(name: string, fallback: string): string {
    return ( process.env[name]?.trim() || fallback);
}

function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);

    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
        throw new Error(`Invalid schedule time: ${time}`);
    }

    return (hours * 60 + minutes);
}

function getLondonDateParts() {
    const timezone = getConfigValue("SCRAPER_TIMEZONE", DEFAULT_TIMEZONE);

    const formatter = new Intl.DateTimeFormat("en-GB",
        {
            timeZone: timezone,
            weekday: "long",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
        });

    const parts = formatter.formatToParts(new Date());

    const getPart = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value ?? "";

    return {
        day: getPart("weekday"),
        time: `${getPart("hour")}:${getPart("minute")}`,
    };
}

export function getScraperScheduleStatus(): ScraperScheduleStatus {
    const startTime = getConfigValue("SCRAPER_START_TIME", DEFAULT_START_TIME);
    const normalStopTime = getConfigValue("SCRAPER_NORMAL_STOP_TIME", DEFAULT_NORMAL_STOP_TIME);
    const thursdayStopTime = getConfigValue("SCRAPER_THURSDAY_STOP_TIME", DEFAULT_THURSDAY_STOP_TIME);

    const { day, time } = getLondonDateParts();

    const stopTime = day === "Thursday" ? thursdayStopTime : normalStopTime;

    const currentMinutes = timeToMinutes(time);

    const startMinutes = timeToMinutes(startTime);

    const stopMinutes = timeToMinutes(stopTime);

    const active = currentMinutes >= startMinutes && currentMinutes < stopMinutes;

    return {
        active,
        currentTime: time,
        currentDay: day,
        startTime,
        stopTime,

        resumesAt: active ? null : startTime,
    };
}

export function isScraperActive(): boolean {
    return (getScraperScheduleStatus().active);
}