const category =
    document.getElementById(
        "category",
    );

const date =
    document.getElementById(
        "date",
    );

const time =
    document.getElementById(
        "time",
    );

const saveButton =
    document.getElementById(
        "save",
    );

const noAvailabilityButton =
    document.getElementById(
        "noAvailability",
    );

const status =
    document.getElementById(
        "status",
    );

const current =
    document.getElementById(
        "current",
    );

let categories = [];

async function load() {
    const response =
        await fetch(
            "/api/manual-availability",
        );

    const data =
        await response.json();

    categories =
        data.categories ?? [];

    category.innerHTML = `
        <option value="">
            Select category
        </option>

        ${categories
        .map(
            (item) => `
                    <option
                        value="${item.key}"
                    >
                        ${item.label}
                    </option>
                `,
        )
        .join("")}
    `;

    renderCurrent();
}

category.addEventListener(
    "change",
    () => {
        const selected =
            categories.find(
                (item) =>
                    item.key ===
                    category.value,
            );

        date.value =
            selected
                ?.nextAvailableDate ??
            "";

        time.value =
            selected
                ?.nextAvailableTime ??
            "";

        status.textContent = "";
    },
);

saveButton.addEventListener(
    "click",
    () => {
        void save(
            date.value || null,
            time.value || null,
        );
    },
);

noAvailabilityButton.addEventListener(
    "click",
    () => {
        date.value = "";
        time.value = "";

        void save(
            null,
            null,
        );
    },
);

async function save(
    nextAvailableDate,
    nextAvailableTime,
) {
    if (!category.value) {
        status.textContent =
            "Select a category first.";

        return;
    }

    status.textContent =
        "Saving...";

    const response =
        await fetch(
            `/api/manual-availability/${encodeURIComponent(category.value)}`,
            {
                method: "PUT",

                headers: {
                    "content-type":
                        "application/json",
                },

                body: JSON.stringify({
                    nextAvailableDate,
                    nextAvailableTime,
                }),
            },
        );

    const data =
        await response.json();

    if (!response.ok) {
        status.textContent =
            data.error ??
            "Could not save.";

        return;
    }

    status.textContent =
        "Saved";

    await load();

    category.value =
        data.category.key;

    date.value =
        data.category
            .nextAvailableDate ??
        "";

    time.value =
        data.category
            .nextAvailableTime ??
        "";
}

function renderCurrent() {
    current.innerHTML =
        categories
            .map(
                (item) => `
                    <div class="current-row">
                        <strong>
                            ${item.label}
                        </strong>

                        <span>
                            ${
                    item.nextAvailableDate
                        ? `${item.nextAvailableDate}
                                       ${item.nextAvailableTime ?? ""}`
                        : "No availability"
                }
                        </span>
                    </div>
                `,
            )
            .join("");
}

void load();