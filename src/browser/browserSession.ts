import type {
    BrowserContext,
    Page,
} from "playwright";

let browserContext: BrowserContext | null = null;
let page: Page | null = null;

export function getBrowserContext() {
    return browserContext;
}

export function getPage() {
    return page;
}

export function setBrowserContext(
    context: BrowserContext | null,
) {
    browserContext = context;
}

export function setPage(
    browserPage: Page | null,
) {
    page = browserPage;
}

export function clearBrowser() {
    browserContext = null;
    page = null;
}