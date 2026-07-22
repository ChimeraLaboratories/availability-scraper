export function isWeekend(dateStr: string): boolean {
    const date = new Date(`${dateStr}T00:00:00`);
    const day = date.getDay();

    return day === 0 || day === 6;
}

export function formatDateTime(
    dateStr: string | null | undefined,
    timeStr: string | null | undefined,
): string | null {
    if (!dateStr || !timeStr) {
        return null;
    }

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