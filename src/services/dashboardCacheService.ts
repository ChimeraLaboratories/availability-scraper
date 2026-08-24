import fs from "node:fs/promises";
import path from "node:path";

import type {
    DashboardCategoryResult,
} from "../types/dashboard.js";

interface DashboardCache {
    updatedAt: string;
    categories: DashboardCategoryResult[];
}

const CACHE_DIRECTORY =
    path.resolve(
        process.cwd(),
        "data",
    );

const CACHE_FILE =
    path.join(
        CACHE_DIRECTORY,
        "dashboard-cache.json",
    );

async function ensureCacheDirectory():
    Promise<void> {
    await fs.mkdir(
        CACHE_DIRECTORY,
        {
            recursive: true,
        },
    );
}

export async function saveDashboardCache(
    categories: DashboardCategoryResult[],
): Promise<void> {
    await ensureCacheDirectory();

    const cache: DashboardCache = {
        updatedAt:
            new Date().toISOString(),

        categories,
    };

    await fs.writeFile(
        CACHE_FILE,
        JSON.stringify(
            cache,
            null,
            2,
        ),
        "utf8",
    );
}

export async function getDashboardCache():
    Promise<DashboardCache | null> {
    try {
        const contents =
            await fs.readFile(
                CACHE_FILE,
                "utf8",
            );

        const parsed =
            JSON.parse(
                contents,
            ) as DashboardCache;

        if (
            !parsed ||
            !Array.isArray(
                parsed.categories,
            )
        ) {
            return null;
        }

        return parsed;
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
        ) {
            return null;
        }

        console.error(
            "Failed to read dashboard cache:",
            error,
        );

        return null;
    }
}