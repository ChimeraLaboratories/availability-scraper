const loadingView = document.getElementById("loadingView");
const loginView = document.getElementById("loginView");
const adminView = document.getElementById("adminView");
const subtitle = document.getElementById("subtitle");
const loginForm = document.getElementById("loginForm");
const totpCode = document.getElementById("totpCode");
const loginButton = document.getElementById("loginButton");
const loginError = document.getElementById("loginError");
const logoutButton = document.getElementById("logoutButton");
const globalMessage = document.getElementById("globalMessage");

const browserStatusValue = document.getElementById("browserStatusValue");
const browserStatusMessage = document.getElementById("browserStatusMessage");
const browserStatusBadge = document.getElementById("browserStatusBadge");
const browserReadyValue = document.getElementById("browserReadyValue");
const browserReadyMessage = document.getElementById("browserReadyMessage");
const browserReadyBadge = document.getElementById("browserReadyBadge");
const browserDetails = document.getElementById("browserDetails");
const browserTitle = document.getElementById("browserTitle");
const browserUrl = document.getElementById("browserUrl");
const refreshBrowserStatusButton = document.getElementById("refreshBrowserStatusButton");

const openBrowserButton = document.getElementById("openBrowserButton");
const continueButton = document.getElementById("continueButton");
const goToSiteButton = document.getElementById("goToSiteButton");
const saveBrowserStateButton = document.getElementById("saveBrowserStateButton");
const browserActionMessage = document.getElementById("browserActionMessage");
const locationSearchForm = document.getElementById("locationSearchForm");
const locationSearchInput = document.getElementById("locationSearchInput");
const locationSearchButton = document.getElementById("locationSearchButton");

const refreshManualButton = document.getElementById("refreshManualButton");
const manualAvailabilityLoading = document.getElementById("manualAvailabilityLoading");
const manualAvailabilityGrid = document.getElementById("manualAvailabilityGrid");

const totpConfigBadge = document.getElementById("totpConfigBadge");
const totpConfigValue = document.getElementById("totpConfigValue");
const browserDebugBadge = document.getElementById("browserDebugBadge");
const browserDebugValue = document.getElementById("browserDebugValue");
const sessionStorageValue = document.getElementById("sessionStorageValue");

const enablePushNotificationsButton = document.getElementById("enablePushNotificationsButton");
const pushNotificationMessage = document.getElementById("pushNotificationMessage");

const MANUAL_KEYS = new Set(["mecs", "ground-floor"]);
let browserStatusTimer = null;

function showView(view) {
    loadingView.classList.add("hidden");
    loginView.classList.add("hidden");
    adminView.classList.add("hidden");
    view.classList.remove("hidden");
}

function setMessage(element, text, variant = "info") {
    element.textContent = text;
    element.className = `message ${variant}`;
}

function clearMessage(element) {
    element.textContent = "";
    element.className = "message hidden";
}

function setBadge(element, text, variant) {
    element.textContent = text;
    element.className = `status-badge ${variant}`;
}

function stopBrowserStatusRefresh() {
    if (browserStatusTimer !== null) {
        window.clearInterval(browserStatusTimer);
        browserStatusTimer = null;
    }
}

function startBrowserStatusRefresh() {
    stopBrowserStatusRefresh();

    browserStatusTimer = window.setInterval(() => {
        if (!document.hidden && !adminView.classList.contains("hidden")) {
            void loadBrowserStatus({ quiet: true });
        }
    }, 15000);
}

function showLogin(message = "") {
    stopBrowserStatusRefresh();
    logoutButton.classList.add("hidden");
    subtitle.textContent = "Enter the current code from your authenticator.";
    clearMessage(loginError);

    if (message) {
        setMessage(loginError, message, "error");
    }

    showView(loginView);
    totpCode.focus();
}

async function loadPushNotificationStatus() {
    clearMessage(pushNotificationMessage);

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        enablePushNotificationsButton.disabled = true;
        enablePushNotificationsButton.textContent = "Push notifications unavailable";
        setMessage(pushNotificationMessage, "Push notifications are not supported on this device or browser.", "error",);
        return;
    }

    if (Notification.permission === "denied") {
        enablePushNotificationsButton.disabled = true;
        enablePushNotificationsButton.textContent = "Notifications blocked";
        setMessage(pushNotificationMessage, "Notification permission is blocked for this app.", "error",);
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            const response = await apiFetch("/api/push/subscribe", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(subscription),
            });

            if (!response.ok) {
                throw new Error(`Unable to synchronise this device subscription (${response.status}).`);
            }

            enablePushNotificationsButton.disabled = true;
            enablePushNotificationsButton.textContent = "Notifications enabled";

            setMessage(pushNotificationMessage, "This device is subscribed to developer notifications.", "success");
            return;
        }

        enablePushNotificationsButton.disabled = false;
        enablePushNotificationsButton.textContent = "Enable notifications on this device";

        if (Notification.permission === "granted") {
            setMessage(
                pushNotificationMessage, "Notification permission is already allowed. This device can now be subscribed.", "info");
        }
    } catch (error) {
        console.error("Unable to check push notification status:", error);

        enablePushNotificationsButton.disabled = false;
        enablePushNotificationsButton.textContent = "Enable notifications on this device";

        setMessage(
            pushNotificationMessage,
            error instanceof Error ? `Unable to check notifications: ${error.message}` : "Unable to check notification status.", "error");
    }
}

async function enablePushNotifications() {
    enablePushNotificationsButton.disabled = true;
    enablePushNotificationsButton.textContent = "Enabling...";
    clearMessage(pushNotificationMessage);

    try {
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
            throw new Error("Push notifications are not supported on this device.");
        }

        const registration = await navigator.serviceWorker.register("/sw.js");

        const permission = await Notification.requestPermission();

        if (permission !== "granted") {
            throw new Error(permission === "denied" ? "Notification permission was denied." : "Notification permission was not granted.");
        }

        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            const keyResponse = await apiFetch("/api/push/public-key");

            if (!keyResponse.ok) {
                throw new Error(`Unable to load push configuration (${keyResponse.status}).`);
            }

            const { publicKey } = await keyResponse.json();

            if (!publicKey) {
                throw new Error("Push public key is missing.");
            }

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: publicKey,
            });
        }

        const response = await apiFetch("/api/push/subscribe", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(subscription),
        });

        if (!response.ok) {
            throw new Error(`Unable to register this device (${response.status}).`);
        }

        enablePushNotificationsButton.textContent = "Notifications enabled";

        setMessage(pushNotificationMessage, "This device is now subscribed to developer notifications.", "success");
    } catch (error) {
        console.error("Unable to enable push notifications:", error);

        enablePushNotificationsButton.disabled = false;
        enablePushNotificationsButton.textContent = "Enable notifications on this device";

        setMessage(pushNotificationMessage, error instanceof Error ? `Unable to enable notifications: ${error.message}` : "Unable to enable notifications.", "error");
    }
}

function showAdmin() {
    logoutButton.classList.remove("hidden");
    subtitle.textContent = "Administrator session active.";
    showView(adminView);
    clearMessage(globalMessage);
    startBrowserStatusRefresh();

    void Promise.all([
        loadBrowserStatus(),
        loadManualAvailability(),
        loadDiagnostics(),
        loadPushNotificationStatus(),
    ]);
}

async function apiFetch(url, options = {}) {
    const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
    });

    if (response.status === 401) {
        showLogin("Your admin session has expired. Sign in again.");
        throw new Error("Authentication required.");
    }

    return response;
}

function setBrowserControls(browserOpen) {
    openBrowserButton.disabled = browserOpen;
    continueButton.disabled = !browserOpen;
    goToSiteButton.disabled = !browserOpen;
    saveBrowserStateButton.disabled = !browserOpen;
    locationSearchInput.disabled = !browserOpen;
    locationSearchButton.disabled = !browserOpen;
}

async function loadBrowserStatus({ quiet = false } = {}) {
    if (!quiet) {
        browserStatusValue.textContent = "Loading...";
        browserStatusMessage.textContent = "Checking browser status...";
        browserReadyValue.textContent = "Loading...";
        browserReadyMessage.textContent = "Waiting for browser status...";
        setBadge(browserStatusBadge, "Checking", "neutral");
        setBadge(browserReadyBadge, "Checking", "neutral");
    }

    try {
        const response = await apiFetch("/api/browser-status");
        const data = await response.json();

        const browserOpen = data.browserOpen === true;
        const ready = data.ready === true;
        const blocked = data.blocked === true || data.needsManualVerification === true;

        browserStatusValue.textContent = browserOpen ? "Open" : "Closed";
        browserStatusMessage.textContent = data.message ?? (browserOpen ? "Browser is running." : "Browser is not open.");

        if (!browserOpen) {
            setBadge(browserStatusBadge, "Closed", "neutral");
        } else if (blocked) {
            setBadge(browserStatusBadge, "Attention", "warning");
        } else {
            setBadge(browserStatusBadge, "Open", "success");
        }

        browserReadyValue.textContent = ready ? "Ready" : "Not ready";
        browserReadyMessage.textContent = ready
            ? "Browser is ready for scraper operations."
            : blocked
                ? "Manual verification or browser attention may be required."
                : "Browser is not ready for scraper operations.";

        setBadge(
            browserReadyBadge,
            ready ? "Ready" : blocked ? "Attention" : "Not ready",
            ready ? "success" : blocked ? "warning" : "neutral",
        );

        const currentUrl = data.currentUrl ?? data.url ?? "";
        const currentTitle = data.title ?? "";

        if (browserOpen && (currentUrl || currentTitle)) {
            browserDetails.classList.remove("hidden");
            browserTitle.textContent = currentTitle || "Current browser page";
            browserUrl.textContent = currentUrl || "URL unavailable";
        } else {
            browserDetails.classList.add("hidden");
        }

        setBrowserControls(browserOpen);
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication required.") {
            return;
        }

        console.error("Unable to load browser status:", error);
        browserStatusValue.textContent = "Unavailable";
        browserStatusMessage.textContent = "Unable to contact the server.";
        browserReadyValue.textContent = "Unknown";
        browserReadyMessage.textContent = "Unable to determine readiness.";
        setBadge(browserStatusBadge, "Error", "danger");
        setBadge(browserReadyBadge, "Unknown", "danger");
        setBrowserControls(false);
    }
}

async function runBrowserAction({ url, method = "GET", button, workingText, successFallback }) {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = workingText;
    clearMessage(browserActionMessage);

    try {
        const response = await apiFetch(url, { method });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.ok === false) {
            throw new Error(data.error ?? data.message ?? `Request failed (${response.status})`);
        }

        setMessage(browserActionMessage, data.message ?? successFallback, "success");
        await loadBrowserStatus({ quiet: true });
        return data;
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication required.") {
            return null;
        }

        console.error("Browser action failed:", error);
        setMessage(
            browserActionMessage,
            error instanceof Error ? error.message : "Browser action failed.",
            "error",
        );
        return null;
    } finally {
        button.textContent = originalText;
        await loadBrowserStatus({ quiet: true });
    }
}

function formatUpdatedAt(value) {
    if (!value) {
        return "Not updated yet";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Updated";
    }

    return `Updated ${date.toLocaleString()}`;
}

function createManualCard(category) {
    const card = document.createElement("article");
    card.className = "manual-card";
    card.dataset.key = category.key;

    const header = document.createElement("div");
    header.className = "manual-card-header";

    const heading = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = category.label;

    const meta = document.createElement("p");
    meta.className = "manual-card-meta";
    meta.textContent = formatUpdatedAt(category.updatedAt);

    heading.append(title, meta);
    header.appendChild(heading);

    const fields = document.createElement("div");
    fields.className = "manual-fields";

    const dateField = document.createElement("div");
    dateField.className = "field";
    const dateLabel = document.createElement("label");
    dateLabel.textContent = "Next available date";
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = category.nextAvailableDate ?? "";
    dateInput.dataset.role = "date";
    dateLabel.htmlFor = `manual-date-${category.key}`;
    dateInput.id = dateLabel.htmlFor;
    dateField.append(dateLabel, dateInput);

    const timeField = document.createElement("div");
    timeField.className = "field";
    const timeLabel = document.createElement("label");
    timeLabel.textContent = "Next available time";
    const timeInput = document.createElement("input");
    timeInput.type = "time";
    timeInput.value = category.nextAvailableTime ?? "";
    timeInput.dataset.role = "time";
    timeLabel.htmlFor = `manual-time-${category.key}`;
    timeInput.id = timeLabel.htmlFor;
    timeField.append(timeLabel, timeInput);

    fields.append(dateField, timeField);

    const actions = document.createElement("div");
    actions.className = "manual-actions";

    const clearButton = document.createElement("button");
    clearButton.type = "button";
    clearButton.className = "secondary-button";
    clearButton.textContent = "Clear";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Save";

    actions.append(clearButton, saveButton);
    card.append(header, fields, actions);

    clearButton.addEventListener("click", () => {
        dateInput.value = "";
        timeInput.value = "";
        void saveManualCategory(category.key, card, saveButton, meta);
    });

    saveButton.addEventListener("click", () => {
        void saveManualCategory(category.key, card, saveButton, meta);
    });

    return card;
}

async function loadDiagnostics() {
    try {
        const response = await apiFetch("/api/admin/diagnostics");
        const data = await response.json();

        if (!response.ok || data.ok !== true) {
            throw new Error(data.error ?? "Unable to load diagnostics.");
        }

        totpConfigValue.textContent = data.totpConfigured ? "Configured" : "Not configured";
        setBadge(
            totpConfigBadge,
            data.totpConfigured ? "Ready" : "Missing",
            data.totpConfigured ? "success" : "danger",
        );

        browserDebugValue.textContent = data.browserDebugEnabled ? "Enabled" : "Disabled";
        setBadge(
            browserDebugBadge,
            data.browserDebugEnabled ? "Enabled" : "Off",
            data.browserDebugEnabled ? "warning" : "success",
        );

        sessionStorageValue.textContent =
            data.sessionStorage === "memory"
                ? "In-memory"
                : String(data.sessionStorage ?? "Unknown");
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication required.") {
            return;
        }

        console.error("Unable to load admin diagnostics:", error);
        totpConfigValue.textContent = "Unavailable";
        browserDebugValue.textContent = "Unavailable";
        sessionStorageValue.textContent = "Unavailable";
        setBadge(totpConfigBadge, "Error", "danger");
        setBadge(browserDebugBadge, "Error", "danger");
    }
}

async function loadManualAvailability() {
    manualAvailabilityLoading.classList.remove("hidden");
    manualAvailabilityGrid.classList.add("hidden");
    manualAvailabilityGrid.replaceChildren();

    try {
        const response = await apiFetch("/api/manual-availability");
        const data = await response.json();

        if (!response.ok || data.ok !== true || !Array.isArray(data.categories)) {
            throw new Error(data.error ?? "Unable to load manual availability.");
        }

        const categories = data.categories.filter((category) => MANUAL_KEYS.has(category.key));

        for (const category of categories) {
            manualAvailabilityGrid.appendChild(createManualCard(category));
        }

        if (categories.length === 0) {
            setMessage(globalMessage, "MECS and Ground Floor manual categories are not configured.", "error");
        }

        manualAvailabilityGrid.classList.remove("hidden");
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication required.") {
            return;
        }

        console.error("Unable to load manual availability:", error);
        setMessage(
            globalMessage,
            error instanceof Error ? error.message : "Unable to load manual availability.",
            "error",
        );
    } finally {
        manualAvailabilityLoading.classList.add("hidden");
    }
}

async function saveManualCategory(key, card, button, metaElement) {
    const dateInput = card.querySelector('[data-role="date"]');
    const timeInput = card.querySelector('[data-role="time"]');

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Saving...";
    clearMessage(globalMessage);

    try {
        const response = await apiFetch(`/api/manual-availability/${encodeURIComponent(key)}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                nextAvailableDate: dateInput.value || null,
                nextAvailableTime: timeInput.value || null,
            }),
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok || data.ok !== true) {
            throw new Error(data.error ?? "Unable to save manual availability.");
        }

        if (data.category) {
            dateInput.value = data.category.nextAvailableDate ?? "";
            timeInput.value = data.category.nextAvailableTime ?? "";
            metaElement.textContent = formatUpdatedAt(data.category.updatedAt);
        }

        setMessage(globalMessage, `${data.category?.label ?? key} availability updated.`, "success");
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication required.") {
            return;
        }

        console.error("Unable to save manual availability:", error);
        setMessage(
            globalMessage,
            error instanceof Error ? error.message : "Unable to save manual availability.",
            "error",
        );
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

async function checkSession() {
    try {
        const response = await fetch("/api/admin/session", {
            credentials: "same-origin",
        });

        if (!response.ok) {
            showLogin();
            return;
        }

        const data = await response.json();

        if (data.authenticated === true) {
            showAdmin();
            return;
        }

        showLogin();
    } catch (error) {
        console.error("Unable to check admin session:", error);
        subtitle.textContent = "Unable to contact the server.";
        showLogin();
    }
}

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const code = totpCode.value.trim();
    clearMessage(loginError);

    if (!/^\d{6}$/.test(code)) {
        setMessage(loginError, "Enter a valid 6-digit code.", "error");
        return;
    }

    loginButton.disabled = true;
    loginButton.textContent = "Signing in...";

    try {
        const response = await fetch("/api/admin/auth", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ code }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.status === 429) {
            setMessage(loginError, data.error ?? "Too many attempts. Try again later.", "error");
            return;
        }

        if (!response.ok) {
            setMessage(loginError, data.error ?? "Authentication failed.", "error");
            totpCode.select();
            return;
        }

        totpCode.value = "";
        showAdmin();
    } catch (error) {
        console.error("Admin login failed:", error);
        setMessage(loginError, "Unable to contact the server.", "error");
    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Sign in";
    }
});

logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
        await fetch("/api/admin/logout", {
            method: "POST",
            credentials: "same-origin",
        });
    } catch (error) {
        console.error("Logout failed:", error);
    } finally {
        logoutButton.disabled = false;
        showLogin();
    }
});

refreshBrowserStatusButton.addEventListener("click", async () => {
    const originalText = refreshBrowserStatusButton.textContent;
    refreshBrowserStatusButton.disabled = true;
    refreshBrowserStatusButton.textContent = "Refreshing...";

    try {
        await loadBrowserStatus();
    } finally {
        refreshBrowserStatusButton.disabled = false;
        refreshBrowserStatusButton.textContent = originalText;
    }
});

openBrowserButton.addEventListener("click", () => {
    void runBrowserAction({
        url: "/api/open-browser",
        button: openBrowserButton,
        workingText: "Opening...",
        successFallback: "Browser opened.",
    });
});

continueButton.addEventListener("click", () => {
    void runBrowserAction({
        url: "/api/continue",
        button: continueButton,
        workingText: "Continuing...",
        successFallback: "Browser session continued.",
    });
});

goToSiteButton.addEventListener("click", () => {
    void runBrowserAction({
        url: "/api/go-to-site",
        button: goToSiteButton,
        workingText: "Opening site...",
        successFallback: "Booking site opened.",
    });
});

saveBrowserStateButton.addEventListener("click", () => {
    void runBrowserAction({
        url: "/api/save-browser-state",
        method: "POST",
        button: saveBrowserStateButton,
        workingText: "Saving...",
        successFallback: "Browser state saved.",
    });
});

locationSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const location = locationSearchInput.value.trim();

    if (!location) {
        setMessage(browserActionMessage, "Enter a location to search.", "error");
        locationSearchInput.focus();
        return;
    }

    await runBrowserAction({
        url: `/api/search-location?location=${encodeURIComponent(location)}`,
        button: locationSearchButton,
        workingText: "Searching...",
        successFallback: "Location search submitted.",
    });
});

refreshManualButton.addEventListener("click", async () => {
    const originalText = refreshManualButton.textContent;
    refreshManualButton.disabled = true;
    refreshManualButton.textContent = "Refreshing...";

    try {
        await loadManualAvailability();
    } finally {
        refreshManualButton.disabled = false;
        refreshManualButton.textContent = originalText;
    }
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !adminView.classList.contains("hidden")) {
        void loadBrowserStatus({ quiet: true });
    }
});

enablePushNotificationsButton.addEventListener("click", () => {
    void enablePushNotifications();
});

checkSession();
