const reportedDateRollovers = new Set<string>();

export function recordDateRollover(date: string): { shouldAlert: boolean } {
    if (reportedDateRollovers.has(date)) {
        return { shouldAlert: false };
    }

    reportedDateRollovers.add(date);

    return { shouldAlert: true };
}