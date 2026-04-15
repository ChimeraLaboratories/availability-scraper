const form = document.getElementById("form");
const statusEl = document.getElementById("status");
const resultsEl = document.getElementById("results");
const startDateEl = document.getElementById("startDate");

const today = new Date();
startDateEl.value = today.toISOString().slice(0, 10);

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function renderResults(data) {
    const days = data.results ?? [];

    if (!days.length) {
        resultsEl.innerHTML = `<div class="card">No matching slots found.</div>`;
        return;
    }

    resultsEl.innerHTML = days.map((day) => {
        const times = day.appointmentSlots
            .map((slot) => `<span class="time">${escapeHtml(slot.startTime)}</span>`)
            .join("");

        return `
      <div class="card">
        <h3>${escapeHtml(day.date)}</h3>
        <p><strong>${day.count}</strong> slot(s)</p>
        <div class="times">${times}</div>
      </div>
    `;
    }).join("");
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    statusEl.textContent = "Loading...";
    resultsEl.innerHTML = "";

    const params = new URLSearchParams({
        storeNumber: document.getElementById("storeNumber").value,
        slotType: document.getElementById("slotType").value,
        startDate: document.getElementById("startDate").value,
        maxNumberOfDays: document.getElementById("maxNumberOfDays").value,
    });

    const afterTime = document.getElementById("afterTime").value;
    const beforeTime = document.getElementById("beforeTime").value;
    const weekdaysOnly = document.getElementById("weekdaysOnly").checked;
    const weekendsOnly = document.getElementById("weekendsOnly").checked;

    if (afterTime) params.set("afterTime", afterTime);
    if (beforeTime) params.set("beforeTime", beforeTime);
    if (weekdaysOnly) params.set("weekdaysOnly", "true");
    if (weekendsOnly) params.set("weekendsOnly", "true");

    try {
        const response = await fetch(`/api/availability?${params.toString()}`);
        const json = await response.json();

        if (!response.ok) {
            throw new Error(json.error || "Request failed");
        }

        statusEl.textContent = `Found ${json.results.length} day(s) with matching availability.`;
        renderResults(json);
    } catch (error) {
        statusEl.textContent = `Error: ${error.message}`;
    }
});