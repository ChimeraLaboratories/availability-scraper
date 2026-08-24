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

function getCategoryState(
    category,
) {
    return JSON.stringify({
        nextAvailableDate:
            category.nextAvailableDate ??
            null,

        nextAvailableTime:
            category.nextAvailableTime ??
            null,

        totalDays:
            category.totalDays ?? 0,

        totalSlots:
            category.totalSlots ?? 0,

        error:
            category.error ?? null,
    });
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

    const changedKeys =
        new Set();

    for (
        const category of
        categories
        ) {
        const state =
            getCategoryState(
                category,
            );

        newCategoryState.set(
            category.key,
            state,
        );

        if (
            hasCompletedInitialLoad &&
            previousCategoryState.has(
                category.key,
            ) &&
            previousCategoryState.get(
                category.key,
            ) !== state
        ) {
            changedKeys.add(
                category.key,
            );
        }
    }

    listEl.innerHTML =
        categories
            .map((category) => {
                const isManual =
                    category
                        .lineOfBusiness ===
                    "MANUAL";

                const hasError =
                    Boolean(
                        category.error,
                    );

                const hasAvailability =
                    Boolean(
                        category
                            .nextAvailableLabel,
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
                        category
                            .nextAvailableLabel;
                }

                const badges = [];

                if (!isManual) {
                    badges.push(
                        buildBadge(
                            `${
                                category
                                    .totalDays ??
                                0
                            } days`,
                            "neutral",
                        ),
                    );

                    badges.push(
                        buildBadge(
                            `${
                                category
                                    .totalSlots ??
                                0
                            } slots`,
                            hasAvailability
                                ? "success"
                                : "warning",
                        ),
                    );
                }

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

                if (
                    changedKeys.has(
                        category.key,
                    )
                ) {
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
                        </div>
                    </div>
                `;
            })
            .join("");

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