// Support for embedding the editor in a popup/iframe opened by another site
// (e.g. the Holmfirth CC members portal's "Edit ride" button), and handing the
// edited GPX file back to it via postMessage rather than a browser download.
//
// The opener passes `?files=["<gpx-url>"]&returnTo=<its own origin>` when
// opening the editor. When a "Save & close" action runs, the current file is
// serialized and posted to `window.opener` at that origin, and the window is
// closed. `returnTo` is checked against this allowlist first, so the editor
// never posts file contents to an arbitrary origin supplied in the URL.
//
// The HCC mobile app (holmfirth-cc-app) opens this same ?files=...&returnTo=
// URL, but inside its own in-app WebView rather than a real browser popup
// (see its EditorScreen) - so there is no window.opener at all. In that
// case react-native-webview injects a window.ReactNativeWebView object into
// the page, which is used as the signal that we're embedded and as the
// channel to post the save/exit message back on instead of window.opener.

const ALLOWED_RETURN_ORIGIN_PATTERNS = [
    /^https:\/\/([a-z0-9-]+\.)*holmfirth\.cc$/,
    /^https:\/\/([a-z0-9-]+\.)*holmfirthcc\.com$/,
];

export function isAllowedReturnOrigin(origin: string): boolean {
    return ALLOWED_RETURN_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

// Present only when running inside the HCC mobile app's in-app editor
// WebView (see holmfirth-cc-app's EditorScreen.tsx). Injected automatically
// by react-native-webview - not something this app sets up itself.
export function getReactNativeWebViewBridge(): { postMessage(message: string): void } | undefined {
    return (globalThis as any).ReactNativeWebView;
}

export type SaveAndCloseMessage = {
    source: 'gpx-studio';
    type: 'save';
    filename: string;
    gpx: string;
};

export type ExitMessage = {
    source: 'gpx-studio';
    type: 'exit';
};
