// Support for embedding the editor in a popup/iframe opened by another site
// (e.g. the Holmfirth CC members portal's "Edit ride" button), and handing the
// edited GPX file back to it via postMessage rather than a browser download.
//
// The opener passes `?files=["<gpx-url>"]&returnTo=<its own origin>` when
// opening the editor. When a "Save & close" action runs, the current file is
// serialized and posted to `window.opener` at that origin, and the window is
// closed. `returnTo` is checked against this allowlist first, so the editor
// never posts file contents to an arbitrary origin supplied in the URL.

const ALLOWED_RETURN_ORIGIN_PATTERNS = [
    /^https:\/\/([a-z0-9-]+\.)*holmfirth\.cc$/,
    /^https:\/\/([a-z0-9-]+\.)*holmfirthcc\.com$/,
];

export function isAllowedReturnOrigin(origin: string): boolean {
    return ALLOWED_RETURN_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

export type SaveAndCloseMessage = {
    source: 'gpx-studio';
    type: 'save';
    filename: string;
    gpx: string;
};
