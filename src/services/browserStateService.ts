import type {
    BrowserStatus,
    SaveBrowserStateResult,
} from "../types/browser.js";
import {getBrowserStatus, saveBrowserState} from "../browser/browserState.js";

export async function readBrowserStatus():
    Promise<BrowserStatus> {
    return getBrowserStatus();
}

export async function persistBrowserState():
    Promise<SaveBrowserStateResult> {
    return saveBrowserState();
}