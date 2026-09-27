import { writable, type Writable } from 'svelte/store';

export enum Tool {
    ROUTING,
    WAYPOINT,
    SCISSORS,
    TIME,
    MERGE,
    EXTRACT,
    ELEVATION,
    REDUCE,
    CLEAN,
}

export const currentTool: Writable<Tool | null> = writable(null);

// Whether the left-hand toolbar icon column is shown. Defaults to true; the
// embedded editor (opened from the members site) hides it by default and
// exposes a toggle for it in the top menu bar instead - see Menu.svelte.
export const toolbarVisible: Writable<boolean> = writable(true);
