import fs from "node:fs/promises";
import path from "node:path";

import {
    manualCategories,
} from "../config/manualCategories.js";

import type {
    ManualAvailabilityData,
    ManualAvailabilityEntry,
} from "../types/manualAvailability.js";

const DATA_FILE = path.resolve(
    process.cwd(),
    "data/manual-availability.json",
);

export async function getManualAvailability():
    Promise<ManualAvailabilityData> {
    try {
        const raw = await fs.readFile(
            DATA_FILE,
            "utf8",
        );

        return JSON.parse(
            raw,
        ) as ManualAvailabilityData;
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
        ) {
            return {};
        }

        throw error;
    }
}

export async function getManualCategoriesWithValues() {
    const values =
        await getManualAvailability();

    return manualCategories.map(
        (category) => ({
            ...category,

            nextAvailableDate:
                values[category.key]
                    ?.nextAvailableDate ??
                null,

            nextAvailableTime:
                values[category.key]
                    ?.nextAvailableTime ??
                null,

            updatedAt:
                values[category.key]
                    ?.updatedAt ??
                null,
        }),
    );
}

export async function updateManualAvailability(
    key: string,
    nextAvailableDate: string | null,
    nextAvailableTime: string | null,
): Promise<ManualAvailabilityEntry> {
    const definition =
        manualCategories.find(
            (category) =>
                category.key === key,
        );

    if (!definition) {
        throw new Error(
            `Unknown manual category: ${key}`,
        );
    }

    const current =
        await getManualAvailability();

    const entry:
        ManualAvailabilityEntry = {
        key,
        label: definition.label,
        nextAvailableDate,
        nextAvailableTime,
        updatedAt:
            new Date().toISOString(),
    };

    current[key] = entry;

    await fs.mkdir(
        path.dirname(DATA_FILE),
        {
            recursive: true,
        },
    );

    await fs.writeFile(
        DATA_FILE,
        JSON.stringify(
            current,
            null,
            2,
        ),
        "utf8",
    );

    return entry;
}