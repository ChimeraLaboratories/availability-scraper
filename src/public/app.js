const statusEl = document.getElementById("status");
const nextEl = document.getElementById("nextAvailable");
const listEl = document.getElementById("list");

const refreshBtn = document.getElementById("refreshBtn");

function setStatus(text, variant = "idle") {
    statusEl.textContent = text;
    statusEl.className = `status-pill status-${variant}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function renderNextAvailable(nextAvailableOverall) {
    if (!nextAvailableOverall) {
        nextEl.className = "next-available-empty";
        nextEl.innerHTML = "No appointments found.";
        return;
    }

    nextEl.className = "next-available-box";
    nextEl.innerHTML = `
        <div>
            <p class="next-title">${escapeHtml(nextAvailableOverall.label)}</p>
            <p class="next-meta">
                Store ${escapeHtml(nextAvailableOverall.storeNumber || "")}
            </p>
        </div>
        <div class="next-time">${escapeHtml(nextAvailableOverall.nextAvailable)}</div>
    `;
}

function buildBadge(text, variant = "neutral") {
    return `<span class="badge badge-${variant}">${escapeHtml(text)}</span>`;
}

function renderCategories(categories) {
    if (!categories?.length) {
        listEl.innerHTML = `<div class="empty-state">No categories available.</div>`;
        return;
    }

    listEl.innerHTML = categories
        .map((category) => {
            const hasError = Boolean(category.error);
            const hasAvailability = Boolean(category.nextAvailable);

            let availabilityText = "No Availability";
            if (hasError) availabilityText = category.error;
            if (hasAvailability) availabilityText = category.nextAvailable;

            const badges = [
                buildBadge(`${category.totalDays || 0} days`, "neutral"),
                buildBadge(`${category.totalSlots || 0} slots`, hasAvailability ? "success" : "warning"),
            ];

            if (hasError) {
                badges.push(buildBadge("Error", "danger"));
            } else if (hasAvailability) {
                badges.push(buildBadge("Available", "success"));
            } else {
                badges.push(buildBadge("No Availability", "warning"));
            }

            const rowClass = !hasAvailability && !hasError
                ? "availability-row no-availability"
                : "availability-row";

            return `
                <div class="${rowClass}">
                    <div class="row-main">
                        <p class="row-title">${escapeHtml(category.label)}</p>
                        <p class="row-subtitle">
                            ${escapeHtml(category.lineOfBusiness || "")}
                            ${category.slotType ? `• ${escapeHtml(category.slotType)}` : ""}
                        </p>
                    </div>

                    <div class="row-next">
                        <span class="row-next-label">Next available</span>
                        <span class="row-next-value">${escapeHtml(availabilityText)}</span>
                    </div>

                    <div class="row-badges">
                        ${badges.join("")}
                    </div>
                </div>
            `;
        })
        .join("");
}
async function loadDashboard() {
    try {
        setStatus("Loading availability...", "loading");

        const response = await fetch("/api/dashboard");
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Failed to load dashboard");
        }

        renderCategories(data.categories || []);
        setStatus("Up to date", "success");
    } catch (error) {
        console.error(error);
        listEl.innerHTML = `<div class="empty-state">${escapeHtml(error.message || "Unknown error")}</div>`;
        setStatus("Load failed", "error");
    }
}

refreshBtn.addEventListener("click", async () => {
    await loadDashboard();
});