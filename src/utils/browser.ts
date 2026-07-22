import type { Page } from "playwright";

export function safeCurrentUrl(
    page: Page | null | undefined,
): string {
    try {
        return page?.url() ?? "about:blank";
    } catch {
        return "about:blank";
    }
}