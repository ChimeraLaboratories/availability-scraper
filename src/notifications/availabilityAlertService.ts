interface CategoryAlertState {
    consecutiveFailures: number;
    alerted: boolean;
    lastError: string | null;
}

const categoryStates = new Map<string, CategoryAlertState>();

const FAILURE_THRESHOLD = 3;

export function recordAvailabilityFailure(categoryKey: string, error: string): { consecutiveFailures: number; shouldAlert: boolean; } {
    const existing = categoryStates.get(categoryKey);

    const consecutiveFailures = (existing?.consecutiveFailures ?? 0) + 1;

    const shouldAlert = consecutiveFailures >= FAILURE_THRESHOLD && !existing?.alerted;

    categoryStates.set(categoryKey, {
        consecutiveFailures,
        alerted: existing?.alerted === true || shouldAlert,
        lastError: error
    });

    return { consecutiveFailures, shouldAlert };
}

export function recordAvailabilitySuccess(categoryKey: string): { recovered: boolean; previousFailures: number } {
    const existing = categoryStates.get(categoryKey);

    const recovered = existing?.alerted === true;

    const previousFailures = existing?.consecutiveFailures ?? 0;

    categoryStates.delete(categoryKey);

    return { recovered, previousFailures };
}