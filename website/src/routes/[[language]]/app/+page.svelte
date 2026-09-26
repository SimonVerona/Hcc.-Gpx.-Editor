<script lang="ts">
    import GPXLayers from '$lib/components/map/gpx-layer/GPXLayers.svelte';
    import ElevationProfile from '$lib/components/elevation-profile/ElevationProfile.svelte';
    import FileList from '$lib/components/file-list/FileList.svelte';
    import GPXStatistics from '$lib/components/GPXStatistics.svelte';
    import Map from '$lib/components/map/Map.svelte';
    import Menu from '$lib/components/Menu.svelte';
    import Toolbar from '$lib/components/toolbar/Toolbar.svelte';
    import StreetViewControl from '$lib/components/map/street-view-control/StreetViewControl.svelte';
    import LayerControl from '$lib/components/map/layer-control/LayerControl.svelte';
    import CoordinatesPopup from '$lib/components/map/CoordinatesPopup.svelte';
    import Resizer from '$lib/components/Resizer.svelte';
    import { Toaster } from '$lib/components/ui/sonner';
    import { i18n } from '$lib/i18n.svelte';
    import { settings } from '$lib/logic/settings';
    import { loadFiles, fileActions, createFile } from '$lib/logic/file-actions';
    import { onDestroy, onMount } from 'svelte';
    import { page } from '$app/state';
    import { gpxStatistics, hoveredPoint, slicedGPXStatistics } from '$lib/logic/statistics';
    import { getURLForGoogleDriveFile } from '$lib/components/embedding/embedding';
    import { db } from '$lib/db';
    import { fileStateCollection } from '$lib/logic/file-state';
    import { isAllowedReturnOrigin } from '$lib/logic/embed-save';
    import { map } from '$lib/components/map/map';

    // Holmfirth Co-op car park - used to center the map when a blank editor
    // (no files/ids requested) is opened from the members site and we can't
    // get the rider's current location.
    const HOLMFIRTH_CENTER: [number, number] = [-1.785, 53.5726];

    function flyToStart(center: [number, number]) {
        map.onLoad((mapInstance) => {
            mapInstance.jumpTo({ center, zoom: 13 });
        });
    }

    const {
        treeFileView,
        elevationProfile,
        bottomPanelSize,
        rightPanelSize,
        additionalDatasets,
        elevationFill,
    } = settings;

    let bottomPanelWidth: number | undefined = $state();
    let bottomPanelOrientation = $derived(
        bottomPanelWidth && bottomPanelWidth >= 540 && $elevationProfile ? 'horizontal' : 'vertical'
    );

    onMount(async () => {
        settings.connectToDatabase(db);
        fileStateCollection.connectToDatabase(db).then(() => {
            // When opened as a popup/iframe by another site (?returnTo=<its origin>),
            // start from a clean slate rather than restoring whatever was left open
            // from a previous editing session in this browser.
            let returnTo = page.url.searchParams.get('returnTo');
            if (returnTo && isAllowedReturnOrigin(returnTo)) {
                fileActions.deleteAllFiles();
            }

            let files: string[] = JSON.parse(page.url.searchParams.get('files') || '[]');
            let ids: string[] = JSON.parse(page.url.searchParams.get('ids') || '[]');
            let urls: string[] = files.concat(ids.map(getURLForGoogleDriveFile));

            if (urls.length > 0) {
                let downloads: Promise<File | null>[] = [];
                urls.forEach((url) => {
                    downloads.push(
                        fetch(url)
                            .then((response) => response.blob())
                            .then((blob) => new File([blob], url.split('/').pop() ?? ''))
                    );
                });

                Promise.all(downloads).then((files) => {
                    loadFiles(files.filter((file) => file !== null));
                });
            } else if (returnTo && isAllowedReturnOrigin(returnTo)) {
                // Blank editor opened from the members site (e.g. the "Create
                // Route" flow). Create an empty file and switch to the routing
                // tool, same as File > New, so the pencil tool has something to
                // draw into straight away instead of doing nothing.
                createFile();

                // Center on the rider's current location if we can get it,
                // otherwise fall back to Holmfirth.
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            flyToStart([position.coords.longitude, position.coords.latitude]);
                        },
                        () => {
                            flyToStart(HOLMFIRTH_CENTER);
                        },
                        { timeout: 8000 }
                    );
                } else {
                    flyToStart(HOLMFIRTH_CENTER);
                }
            }
        });
    });

    onDestroy(() => {
        settings.disconnectFromDatabase();
        fileStateCollection.disconnectFromDatabase();
    });
</script>

<div class="fixed mt-[100%] -z-10 text-transparent">
    <h1>{i18n._('metadata.home_title')} — {i18n._('metadata.app_title')}</h1>
    <p>{i18n._('metadata.description')}</p>
    <h2>{i18n._('toolbar.routing.tooltip')}</h2>
    <p>{i18n._('toolbar.routing.help_no_file')}</p>
    <p>{i18n._('toolbar.routing.help')}</p>
    <h3>{i18n._('toolbar.routing.reverse.button')}</h3>
    <p>{i18n._('toolbar.routing.reverse.tooltip')}</p>
    <h3>{i18n._('toolbar.routing.route_back_to_start.button')}</h3>
    <p>{i18n._('toolbar.routing.route_back_to_start.tooltip')}</p>
    <h3>{i18n._('toolbar.routing.round_trip.button')}</h3>
    <p>{i18n._('toolbar.routing.round_trip.tooltip')}</p>
    <h3>{i18n._('toolbar.routing.start_loop_here')}</h3>
    <h2>{i18n._('toolbar.scissors.tooltip')}</h2>
    <p>{i18n._('toolbar.scissors.help')}</p>
    <h2>{i18n._('toolbar.time.tooltip')}</h2>
    <p>{i18n._('toolbar.time.help')}</p>
    <h2>{i18n._('toolbar.merge.tooltip')}</h2>
    <h3>{i18n._('toolbar.merge.merge_traces')}</h3>
    <p>{i18n._('toolbar.merge.help_merge_traces')}</p>
    <h3>{i18n._('toolbar.merge.merge_contents')}</h3>
    <p>{i18n._('toolbar.merge.help_merge_contents')}</p>
    <h2>{i18n._('toolbar.elevation.button')}</h2>
    <p>{i18n._('toolbar.elevation.help')}</p>
    <h2>{i18n._('toolbar.waypoint.tooltip')}</h2>
    <p>{i18n._('toolbar.waypoint.help')}</p>
    <h2>{i18n._('toolbar.reduce.tooltip')}</h2>
    <p>{i18n._('toolbar.reduce.help')}</p>
    <h2>{i18n._('toolbar.clean.tooltip')}</h2>
    <p>{i18n._('toolbar.clean.help')}</p>
    <h2>
        {i18n._('gpx.files')}, {i18n._('gpx.tracks')}, {i18n._('gpx.segments')}, {i18n._(
            'gpx.waypoints'
        )}
    </h2>
</div>

<div class="fixed flex flex-row w-dvw h-dvh">
    <div class="flex flex-col grow h-full min-w-0">
        <div class="grow relative">
            <Menu />
            <div
                class="absolute top-0 bottom-0 left-0 z-20 flex flex-col justify-center pointer-events-none"
            >
                <Toolbar />
            </div>
            <Map class="h-full {$treeFileView ? '' : 'horizontal'}" />
            <StreetViewControl />
            <LayerControl />
            <GPXLayers />
            <CoordinatesPopup />
            <Toaster richColors />
            {#if !$treeFileView}
                <div class="h-10 -translate-y-10 w-full pointer-events-none absolute z-30">
                    <FileList orientation="horizontal" />
                </div>
            {/if}
        </div>
        {#if $elevationProfile}
            <Resizer
                orientation="row"
                bind:after={$bottomPanelSize}
                minAfter={100}
                maxAfter={300}
            />
        {/if}
        <div
            bind:offsetWidth={bottomPanelWidth}
            class="flex {bottomPanelOrientation == 'vertical'
                ? 'flex-col'
                : 'flex-row py-2'} gap-1 px-4"
            style={$elevationProfile ? `height: ${$bottomPanelSize}px` : ''}
        >
            <GPXStatistics
                {gpxStatistics}
                {slicedGPXStatistics}
                orientation={bottomPanelOrientation == 'horizontal' ? 'vertical' : 'horizontal'}
            />
            {#if $elevationProfile}
                <ElevationProfile
                    {gpxStatistics}
                    {slicedGPXStatistics}
                    {hoveredPoint}
                    {additionalDatasets}
                    {elevationFill}
                />
            {/if}
        </div>
    </div>
    {#if $treeFileView}
        <Resizer orientation="col" bind:after={$rightPanelSize} minAfter={100} maxAfter={400} />
        <FileList orientation="vertical" recursive={true} style="width: {$rightPanelSize}px" />
    {/if}
</div>

<style lang="postcss">
    @reference "tailwindcss";

    div :global(.toaster.group) {
        @apply absolute;
        @apply right-2;
        --offset: 50px !important;
    }
</style>
