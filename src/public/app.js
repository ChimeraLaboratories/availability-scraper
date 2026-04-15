const statusEl = document.getElementById("status");
const nextEl = document.getElementById("nextAvailable");
const listEl = document.getElementById("list");

const openBrowserBtn = document.getElementById("openBrowserBtn");
const refreshBtn = document.getElementById("refreshBtn");

const REFRESH_MS = 60_000;

let previousSnapshot = new Map();
let previousOverallKey = null;
let refreshTimer = null;
let audioContext = null;

function escapeHtml(v) {
    return String(v)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function getCategoryKey(category) {
    return `${category.nextAvailableDate || ""}|${category.nextAvailableTime || ""}`;
}

function getOverallKey(item) {
    if (!item) return null;
    return `${item.label}|${item.nextAvailableDate || ""}|${item.nextAvailableTime || ""}`;
}

function compareSlotKeys(a, b) {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
}

function ensureAudioContext() {
    if (!audioContext) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
            audioContext = new Ctx();
        }
    }
    return audioContext;
}

async function unlockAudio() {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
        try {
            await ctx.resume();
        } catch {
        }
    }
}

async function playBeep() {
    const ctx = ensureAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
        try {
            await ctx.resume();
        } catch {
            return;
        }
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.25);
}

function renderNext(item, changed) {
    if (!item) {
        nextEl.innerHTML = `<div class="next-empty">No availability</div>`;
        return;
    }

    nextEl.innerHTML = `
        <div class="next-card ${changed ? "updated" : ""}">
            <div class="next-label">${escapeHtml(item.label)}</div>
            <div class="next-time">
                ${escapeHtml(item.nextAvailableDate)} @ ${escapeHtml(item.nextAvailableTime)}
            </div>
        </div>
    `;
}

function renderList(categories, changedKeys) {
    listEl.innerHTML = categories.map((c) => {
        const changedClass = changedKeys.has(c.key) ? " updated" : "";

        if (c.error) {
            return `
                <div class="row error${changedClass}">
                    <span>${escapeHtml(c.label)}</span>
                    <span>Error</span>
                </div>
            `;
        }

        return `
            <div class="row${changedClass}">
                <span>${escapeHtml(c.label)}</span>
                <span>
                    ${escapeHtml(c.nextAvailableDate || "-")}
                    ${c.nextAvailableTime ? " @ " + escapeHtml(c.nextAvailableTime) : ""}
                </span>
            </div>
        `;
    }).join("");
}

function updateStatus(message) {
    statusEl.textContent = message;
}

async function load({ silent = false } = {}) {
    if (!silent) {
        updateStatus("Loading...");
    }

    try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Failed");
        }

        const changedKeys = new Set();
        let shouldBeep = false;

        for (const category of data.categories) {
            const newKey = getCategoryKey(category);
            const oldKey = previousSnapshot.get(category.key);

            if (oldKey !== undefined && oldKey !== newKey) {
                changedKeys.add(category.key);

                if (compareSlotKeys(newKey, oldKey) < 0) {
                    shouldBeep = true;
                }
            }

            if (oldKey === undefined && newKey) {
                changedKeys.add(category.key);
            }
        }

        const newOverallKey = getOverallKey(data.nextAvailableOverall);
        const overallChanged =
            previousOverallKey !== null && newOverallKey !== previousOverallKey;

        if (overallChanged) {
            shouldBeep = true;
        }

        renderNext(data.nextAvailableOverall, overallChanged);
        renderList(data.categories, changedKeys);

        previousSnapshot = new Map(
            data.categories.map((c) => [c.key, getCategoryKey(c)])
        );
        previousOverallKey = newOverallKey;

        const now = new Date();
        updateStatus(`Last updated: ${now.toLocaleTimeString()}`);

        if (shouldBeep) {
            await playBeep();
        }
    } catch (e) {
        updateStatus("Error: " + e.message);
    }
}

function startAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }

    refreshTimer = setInterval(() => {
        load({ silent: true });
    }, REFRESH_MS);
}

openBrowserBtn.onclick = async () => {
    await unlockAudio();
    updateStatus("Opening browser...");
    try {
        const res = await fetch("/api/open-browser");
        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.error || "Failed to open browser");
        }

        updateStatus(data.message || "Complete booking flow in Edge.");
    } catch (e) {
        updateStatus("Error: " + e.message);
    }
};

refreshBtn.onclick = async () => {
    await unlockAudio();
    await load();
};

document.addEventListener("click", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

load();
startAutoRefresh();