const loadingView =
    document.getElementById(
        "loadingView",
    );

const loginView =
    document.getElementById(
        "loginView",
    );

const adminView =
    document.getElementById(
        "adminView",
    );

const subtitle =
    document.getElementById(
        "subtitle",
    );

const loginForm =
    document.getElementById(
        "loginForm",
    );

const totpCode =
    document.getElementById(
        "totpCode",
    );

const loginButton =
    document.getElementById(
        "loginButton",
    );

const loginError =
    document.getElementById(
        "loginError",
    );

const logoutButton =
    document.getElementById(
        "logoutButton",
    );

const browserStatusValue = document.getElementById("browserStatusValue");
const browserStatusMessage = document.getElementById("browserStatusMessage");
const browserReadyValue = document.getElementById("browserReadyValue");
const browserReadyMessage = document.getElementById("browserReadyMessage");

function showView(view) {
    loadingView.classList.add(
        "hidden",
    );

    loginView.classList.add(
        "hidden",
    );

    adminView.classList.add(
        "hidden",
    );

    view.classList.remove(
        "hidden",
    );
}

function showLogin() {
    subtitle.textContent =
        "Enter the current code from your authenticator.";

    loginError.classList.add(
        "hidden",
    );

    loginError.textContent = "";

    showView(loginView);

    totpCode.focus();
}

function showAdmin() {
    subtitle.textContent =
        "Administrator session active.";

    showView(adminView);

    loadBrowserStatus();
}

async function loadBrowserStatus() {
    browserStatusValue.textContent = "Loading...";
    browserStatusMessage.textContent = "Checking browser status...";
    browserReadyValue.textContent = "Loading...";
    browserReadyMessage.textContent = "Waiting for browser status...";

    try {
        const response =
            await fetch(
                "/api/browser-status",
                {
                    credentials:
                        "same-origin",
                },
            );

        if (response.status === 401) {
            showLogin();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            browserStatusValue.textContent = "Unavailable";
            browserStatusMessage.textContent = data.message ?? "Unable to read browser status.";

            browserReadyValue.textContent = "Unknown";
            browserReadyMessage.textContent = "Browser readiness could not be determined.";
            return;
        }

        browserStatusValue.textContent = data.browserOpen ? "Open" : "Closed";
        browserStatusMessage.textContent = data.message ?? "No status message.";

        browserReadyValue.textContent = data.ready ? "Ready" : "Not ready";

        browserReadyMessage.textContent = data.ready ? "Browser is ready for scraper operations." : "Browser is not ready for scraper operations.";

    } catch (error) {
        console.error("Unable to load browser status:", error,);

        browserStatusValue.textContent = "Unavailable";
        browserStatusMessage.textContent = "Unable to contact the server.";

        browserReadyValue.textContent = "Unknown";
        browserReadyMessage.textContent = "Unable to determine readiness.";
    }
}

async function checkSession() {
    try {
        const response =
            await fetch(
                "/api/admin/session",
                {
                    credentials:
                        "same-origin",
                },
            );

        if (!response.ok) {
            showLogin();
            return;
        }

        const data =
            await response.json();

        if (
            data.authenticated ===
            true
        ) {
            showAdmin();
            return;
        }

        showLogin();
    } catch (error) {
        console.error(
            "Unable to check admin session:",
            error,
        );

        subtitle.textContent =
            "Unable to contact the server.";

        showLogin();
    }
}

loginForm.addEventListener(
    "submit",
    async (event) => {
        event.preventDefault();

        const code =
            totpCode.value.trim();

        loginError.classList.add(
            "hidden",
        );

        if (
            !/^\d{6}$/.test(code)
        ) {
            loginError.textContent =
                "Enter a valid 6-digit code.";

            loginError.classList.remove(
                "hidden",
            );

            return;
        }

        loginButton.disabled =
            true;

        loginButton.textContent =
            "Signing in…";

        try {
            const response =
                await fetch(
                    "/api/admin/auth",
                    {
                        method: "POST",

                        credentials:
                            "same-origin",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                code,
                            }),
                    },
                );

            const data =
                await response
                    .json()
                    .catch(
                        () => ({}),
                    );

            if (
                response.status ===
                429
            ) {
                loginError.textContent =
                    data.error ??
                    "Too many attempts. Try again later.";

                loginError.classList.remove(
                    "hidden",
                );

                return;
            }

            if (!response.ok) {
                loginError.textContent =
                    data.error ??
                    "Authentication failed.";

                loginError.classList.remove(
                    "hidden",
                );

                totpCode.select();

                return;
            }

            totpCode.value = "";

            showAdmin();
        } catch (error) {
            console.error(
                "Admin login failed:",
                error,
            );

            loginError.textContent =
                "Unable to contact the server.";

            loginError.classList.remove(
                "hidden",
            );
        } finally {
            loginButton.disabled =
                false;

            loginButton.textContent =
                "Sign in";
        }
    },
);

logoutButton.addEventListener(
    "click",
    async () => {
        logoutButton.disabled =
            true;

        try {
            await fetch(
                "/api/admin/logout",
                {
                    method: "POST",

                    credentials:
                        "same-origin",
                },
            );
        } catch (error) {
            console.error(
                "Logout failed:",
                error,
            );
        } finally {
            logoutButton.disabled =
                false;

            showLogin();
        }
    },
);

checkSession();