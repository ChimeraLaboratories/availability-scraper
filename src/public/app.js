const statusEl =
    document.getElementById("status");

const nextEl =
    document.getElementById(
        "nextAvailable",
    );

const listEl =
    document.getElementById("list");

const refreshBtn =
    document.getElementById(
        "refreshBtn",
    );

const availabilityTitleEl = document.getElementById("availabilityTitle");

console.log(
    "LOADED: app.js",
);

const AUTO_REFRESH_INTERVAL =
    60 * 1000;

let isLoading = false;
let refreshTimer = null;

let previousCategoryState =
    new Map();

let hasCompletedInitialLoad =
    false;

function setStatus(
    text,
    variant = "idle",
) {
    statusEl.textContent = text;

    statusEl.className =
        `status-pill status-${variant}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatLastUpdated(
    isoDate,
) {
    if (!isoDate) {
        return null;
    }

    const date =
        new Date(isoDate);

    if (
        Number.isNaN(
            date.getTime(),
        )
    ) {
        return null;
    }

    return date.toLocaleTimeString(
        "en-GB",
        {
            hour: "2-digit",
            minute: "2-digit",
        },
    );
}

function formatDashboardDate() {
    return new Intl.DateTimeFormat(
        "en-GB",
        {
            weekday: "long",
            day: "numeric",
            month: "long",
        },
    ).format(new Date());
}

function formatRelativeAppointment(
    dateValue,
    timeValue,
    fallbackLabel,
) {
    if (!dateValue) {
        return fallbackLabel;
    }

    /*
     * Parse YYYY-MM-DD as a LOCAL date rather
     * than UTC to avoid date shifting.
     */
    const parts =
        String(dateValue)
            .split("-")
            .map(Number);

    if (parts.length !== 3) {
        return fallbackLabel;
    }

    const appointmentDate =
        new Date(
            parts[0],
            parts[1] - 1,
            parts[2],
        );

    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0,
    );

    appointmentDate.setHours(
        0,
        0,
        0,
        0,
    );

    const difference =
        Math.round(
            (
                appointmentDate -
                today
            ) /
            86400000,
        );

    /*
     * Keep the formatted time from the existing
     * API label where possible.
     */
    let displayTime = "";

    if (fallbackLabel) {
        const match =
            fallbackLabel.match(
                /\bat\s+(.+)$/i,
            );

        if (match) {
            displayTime =
                match[1];
        }
    }

    if (!displayTime && timeValue) {
        displayTime =
            String(timeValue);
    }

    if (difference === 0) {
        return displayTime
            ? `Today at ${displayTime}`
            : "Today";
    }

    if (difference === 1) {
        return displayTime
            ? `Tomorrow at ${displayTime}`
            : "Tomorrow";
    }

    return fallbackLabel;
}

if (availabilityTitleEl) {
    availabilityTitleEl.innerHTML = `
        Availability List
        <span class="header-date">
            ${escapeHtml(
        formatDashboardDate(),
    )}
        </span>
    `;
}


function renderNextAvailable(
    nextAvailableOverall,
) {
    if (!nextEl) {
        return;
    }

    if (!nextAvailableOverall) {
        nextEl.className =
            "next-available-empty";

        nextEl.innerHTML =
            "No appointments found.";

        return;
    }

    nextEl.className =
        "next-available-box";

    nextEl.innerHTML = `
        <div>
            <p class="next-title">
                ${escapeHtml(
        nextAvailableOverall.label,
    )}
            </p>

            <p class="next-meta">
                Next available
            </p>
        </div>

        <div class="next-time">
            ${escapeHtml(
        nextAvailableOverall
            .nextAvailableLabel,
    )}
        </div>
    `;
}

function buildBadge(
    text,
    variant = "neutral",
) {
    return `
        <span
            class="badge badge-${variant}"
        >
            ${escapeHtml(text)}
        </span>
    `;
}

/*
 * Store the values we care about.
 *
 * These are compared with the values from
 * the previous refresh.
 */
function getCategoryState(
    category,
) {
    return {
        nextAvailableDate:
            category.nextAvailableDate ??
            null,

        nextAvailableTime:
            category.nextAvailableTime ??
            null,

        nextAvailableLabel:
            category.nextAvailableLabel ??
            null,

        totalSlots:
            category.totalSlots ?? 0,

        error:
            category.error ?? null,
    };
}

/*
 * Work out exactly WHAT changed.
 */
function getChangeDetails(
    previousState,
    currentState,
) {
    if (!previousState) {
        return [];
    }

    const changes = [];

    const previousAvailable =
        Boolean(
            previousState
                .nextAvailableLabel,
        );

    const currentAvailable =
        Boolean(
            currentState
                .nextAvailableLabel,
        );

    /*
     * Availability appeared/disappeared.
     */
    if (
        previousAvailable !==
        currentAvailable
    ) {
        changes.push(
            currentAvailable
                ? "NOW AVAILABLE"
                : "NO AVAILABILITY",
        );

        return changes;
    }

    /*
     * Earliest appointment changed.
     */
    const timeChanged =
        previousState
            .nextAvailableDate !==
        currentState
            .nextAvailableDate ||
        previousState
            .nextAvailableTime !==
        currentState
            .nextAvailableTime ||
        previousState
            .nextAvailableLabel !==
        currentState
            .nextAvailableLabel;

    if (timeChanged) {
        changes.push(
            "TIME CHANGED",
        );
    }

    /*
     * Number of available slots changed.
     */
    if (
        previousState.totalSlots !==
        currentState.totalSlots
    ) {
        changes.push(
            "SLOTS CHANGED",
        );
    }

    /*
     * Error state changed.
     */
    if (
        previousState.error !==
        currentState.error
    ) {
        changes.push(
            currentState.error
                ? "ERROR"
                : "ERROR CLEARED",
        );
    }

    return changes;
}

/*
 * Decide what the temporary badge should say.
 */
function getChangeLabel(changes) {
    return changes.length
        ? "UPDATED"
        : "";
}

function renderCategories(
    categories,
) {
    if (!categories?.length) {
        listEl.innerHTML = `
            <div class="empty-state">
                No categories available.
            </div>
        `;

        previousCategoryState =
            new Map();

        hasCompletedInitialLoad =
            true;

        return;
    }

    const newCategoryState =
        new Map();

    const changedCategories =
        new Map();

    /*
     * Compare this refresh against the
     * previous successful refresh.
     */
    for (
        const category of
        categories
        ) {
        const currentState =
            getCategoryState(
                category,
            );

        newCategoryState.set(
            category.key,
            currentState,
        );

        /*
         * Don't mark anything as changed
         * during the initial page load.
         */
        if (
            hasCompletedInitialLoad &&
            previousCategoryState.has(
                category.key,
            )
        ) {
            const previousState =
                previousCategoryState.get(
                    category.key,
                );

            const changes =
                getChangeDetails(
                    previousState,
                    currentState,
                );

            if (changes.length) {
                changedCategories.set(
                    category.key,
                    changes,
                );
            }
        }
    }

    listEl.innerHTML =
        categories
            .map((category) => {
                const hasError =
                    Boolean(
                        category.error,
                    );

                const hasAvailability =
                    Boolean(
                        category
                            .nextAvailableLabel,
                    );

                /*
                 * Get changes for this row.
                 */
                const changes =
                    changedCategories.get(
                        category.key,
                    ) || [];

                const changeLabel =
                    getChangeLabel(
                        changes,
                    );

                let availabilityText =
                    "No Availability";

                if (hasError) {
                    availabilityText =
                        category.error;
                } else if (
                    hasAvailability
                ) {
                    availabilityText =
                        formatRelativeAppointment(
                            category.nextAvailableDate,
                            category.nextAvailableTime,
                            category.nextAvailableLabel,
                        );
                }

                const badges = [];

                if (hasError) {
                    badges.push(
                        buildBadge(
                            "Error",
                            "danger",
                        ),
                    );
                } else if (
                    hasAvailability
                ) {
                    badges.push(
                        buildBadge(
                            "Available",
                            "success",
                        ),
                    );
                } else {
                    badges.push(
                        buildBadge(
                            "No Availability",
                            "warning",
                        ),
                    );
                }

                const rowClasses = [
                    "availability-row",
                ];

                if (
                    !hasAvailability &&
                    !hasError
                ) {
                    rowClasses.push(
                        "no-availability",
                    );
                }

                /*
                 * This triggers the CSS
                 * green update animation.
                 */
                if (changes.length) {
                    rowClasses.push(
                        "availability-updated",
                    );
                }

                const rowClass =
                    rowClasses.join(" ");

                return `
                    <div
                        class="${rowClass}"
                        data-category-key="${escapeHtml(
                    category.key,
                )}"
                    >
                        <div class="row-main">
                            <p class="row-title">
                                ${escapeHtml(
                    category.label,
                )}
                            </p>
                        </div>

                        <div class="row-next">
                            <span
                                class="row-next-label"
                            >
                                Next available
                            </span>

                            <span
                                class="row-next-value"
                            >
                                ${escapeHtml(
                    availabilityText,
                )}
                            </span>
                        </div>

<div class="row-badges">
    ${badges.join("")}

    ${
                    changeLabel
                        ? `
                <span
                    class="update-detail-badge"
                >
                    UPDATED
                </span>
            `
                        : ""
                }
</div>
                    </div>
                `;
            })
            .join("");

    /*
     * IMPORTANT:
     * Save this refresh so it can be
     * compared against the next refresh.
     */
    previousCategoryState =
        newCategoryState;

    hasCompletedInitialLoad =
        true;
}

function showUpdateSuccess() {
    document.body.classList.remove(
        "dashboard-updating",
    );

    document.body.classList.add(
        "dashboard-updated",
    );

    setTimeout(() => {
        document.body.classList.remove(
            "dashboard-updated",
        );
    }, 1200);
}

async function loadDashboard() {
    setStatus(
        "Updating...",
        "loading",
    );

    document.body.classList.add(
        "dashboard-updating",
    );

    refreshBtn.disabled = true;

    try {
        const response =
            await fetch(
                "/api/dashboard",
                {
                    cache: "no-store",
                },
            );

        const data =
            await response.json();

        console.log(
            "DASHBOARD DATA:",
            data,
        );

        if (!response.ok) {
            new Error(
                data.error ||
                "Failed to load dashboard",
            );
        }

        renderCategories(
            data.categories || [],
        );

        renderNextAvailable(
            data.nextAvailableOverall,
        );

        const lastUpdated =
            formatLastUpdated(
                data.lastUpdatedAt,
            );

        if (
            data.schedule &&
            !data.schedule.active
        ) {
            if (lastUpdated) {
                setStatus(
                    `Paused · Last checked ${lastUpdated} · Resumes ${data.schedule.resumesAt}`,
                    "idle",
                );
            } else {
                setStatus(
                    `Paused · Resumes ${data.schedule.resumesAt}`,
                    "idle",
                );
            }
        } else {
            setStatus(
                lastUpdated
                    ? `Updated ${lastUpdated}`
                    : "Up to date",
                "success",
            );
        }

        showUpdateSuccess();
    } catch (error) {
        console.error(error);

        document.body.classList.remove(
            "dashboard-updating",
        );

        listEl.innerHTML = `
            <div class="empty-state">
                ${escapeHtml(
            error instanceof Error
                ? error.message
                : "Unknown error",
        )}
            </div>
        `;

        setStatus(
            "Load failed",
            "error",
        );
    } finally {
        refreshBtn.disabled = false;
    }
}

function scheduleNextRefresh() {
    clearTimeout(
        refreshTimer,
    );

    refreshTimer =
        setTimeout(
            () => {
                void refreshDashboard();
            },
            AUTO_REFRESH_INTERVAL,
        );
}

async function refreshDashboard() {
    if (isLoading) {
        return;
    }

    isLoading = true;

    clearTimeout(
        refreshTimer,
    );

    try {
        await loadDashboard();
    } finally {
        isLoading = false;

        scheduleNextRefresh();
    }
}

refreshBtn.addEventListener(
    "click",
    async () => {
        await refreshDashboard();
    },
);

void refreshDashboard();