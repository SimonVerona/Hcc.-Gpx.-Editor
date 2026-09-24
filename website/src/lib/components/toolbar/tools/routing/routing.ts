import type { Coordinates } from 'gpx';
import { TrackPoint, distance } from 'gpx';
import { settings } from '$lib/logic/settings';
import { getElevation } from '$lib/utils';
import { get } from 'svelte/store';

const { routing, routingProfile } = settings;

// All profiles are routed through BRouter's public server (brouter.de), which
// permits public use. gpx.studio's own graphhopper.gpx.studio instance is
// private to their domains and rejects requests from other origins.
export const routingProfiles: { [key: string]: string } = {
    bike: 'trekking',
    racing_bike: 'fastbike',
    gravel_bike: 'trekking',
    mountain_bike: 'mtb',
    foot: 'hiking-mountain',
    motorcycle: 'moped',
    water: 'river',
    railway: 'rail',
};

export function route(points: Coordinates[]): Promise<TrackPoint[]> {
    if (get(routing)) {
        return getBRouterRoute(points, routingProfiles[get(routingProfile)]);
    } else {
        return getIntermediatePoints(points);
    }
}

async function getBRouterRoute(
    points: Coordinates[],
    brouterProfile: string
): Promise<TrackPoint[]> {
    let url = `https://brouter.de/brouter?lonlats=${points.map((point) => `${point.lon.toFixed(8)},${point.lat.toFixed(8)}`).join('|')}&profile=${brouterProfile}&format=geojson&alternativeidx=0`;

    let response = await fetch(url);

    if (!response.ok) {
        const error = await response.text();
        if (error.includes('from-position not mapped in existing datafile')) {
            throw new Error('toolbar.routing.error.from');
        } else if (error.includes('via1-position not mapped in existing datafile')) {
            throw new Error('toolbar.routing.error.via');
        } else if (error.includes('to-position not mapped in existing datafile')) {
            throw new Error('toolbar.routing.error.to');
        } else if (error.includes('Time-out')) {
            throw new Error('toolbar.routing.error.timeout');
        } else {
            throw new Error(error);
        }
    }

    let geojson = await response.json();

    let route: TrackPoint[] = [];
    let coordinates = geojson.features[0].geometry.coordinates;
    let messages = geojson.features[0].properties.messages;

    const lngIdx = messages[0].indexOf('Longitude');
    const latIdx = messages[0].indexOf('Latitude');
    const tagIdx = messages[0].indexOf('WayTags');
    let messageIdx = 1;
    let tags = messageIdx < messages.length ? getTags(messages[messageIdx][tagIdx]) : {};

    for (let i = 0; i < coordinates.length; i++) {
        route.push(
            new TrackPoint({
                attributes: {
                    lat: coordinates[i][1],
                    lon: coordinates[i][0],
                },
                ele: coordinates[i][2] ?? (i > 0 ? route[i - 1].ele : 0),
            })
        );

        if (
            messageIdx < messages.length &&
            coordinates[i][0] == Number(messages[messageIdx][lngIdx]) / 1000000 &&
            coordinates[i][1] == Number(messages[messageIdx][latIdx]) / 1000000
        ) {
            messageIdx++;

            if (messageIdx == messages.length) tags = {};
            else tags = getTags(messages[messageIdx][tagIdx]);
        }

        route[route.length - 1].setExtensions(tags);
    }

    return route;
}

function getTags(message: string): { [key: string]: string } {
    const fields = message.split(' ');
    let tags: { [key: string]: string } = {};
    for (let i = 0; i < fields.length; i++) {
        let [key, value] = fields[i].split('=');
        key = key.replace(/:/g, '_');
        tags[key] = value;
    }
    return tags;
}

function getIntermediatePoints(points: Coordinates[]): Promise<TrackPoint[]> {
    let route: TrackPoint[] = [];
    let step = 0.05;

    for (let i = 0; i < points.length - 1; i++) {
        // Add intermediate points between each pair of points
        let dist = distance(points[i], points[i + 1]) / 1000;
        for (let d = 0; d < dist; d += step) {
            let lat = points[i].lat + (d / dist) * (points[i + 1].lat - points[i].lat);
            let lon = points[i].lon + (d / dist) * (points[i + 1].lon - points[i].lon);
            route.push(
                new TrackPoint({
                    attributes: {
                        lat: lat,
                        lon: lon,
                    },
                })
            );
        }
    }

    route.push(
        new TrackPoint({
            attributes: {
                lat: points[points.length - 1].lat,
                lon: points[points.length - 1].lon,
            },
        })
    );

    return getElevation(route).then((elevations) => {
        route.forEach((point, i) => {
            point.ele = elevations[i];
        });
        return route;
    });
}
