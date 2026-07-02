import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import type { LocationFix, RiverRoute, RoutePoint } from "../types/route";
import {
  createCumulativeDistancesMeters,
  findClosestPointOnRoute,
  remainingDistanceMeters
} from "./geoMath";
import { parseRouteFile } from "./parseRouteFile";
import {
  createInitialRouteMatch,
  defaultRouteMatchSettings,
  updateRouteMatch
} from "./routeMatching";
import { plannedSpeedEta } from "./eta";

const sampleGpxPath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../data/Planned_GPX_track.gpx"
);

function loadSampleRoute(): RiverRoute {
  return parseRouteFile(
    readFileSync(sampleGpxPath, "utf8"),
    "Planned_GPX_track.gpx"
  );
}

function buildTestRoute(points: RoutePoint[]): RiverRoute {
  const cumulativeDistancesMeters = createCumulativeDistancesMeters(points);
  const totalDistanceMeters = cumulativeDistancesMeters.at(-1) ?? 0;

  return {
    id: "test-route",
    name: "Test route",
    points,
    waypoints: [],
    totalDistanceMeters,
    cumulativeDistancesMeters
  };
}

describe("river route parsing", () => {
  it("parses the bundled Clearwater GPX sample", () => {
    const route = loadSampleRoute();

    assert.equal(
      route.name,
      "Selected put-in to Selected take-out on the Clearwater River"
    );
    assert.equal(route.points.length, 133);
    assert.deepEqual(
      route.waypoints.map((waypoint) => waypoint.name),
      ["Put-in", "Take-out"]
    );
    assert.ok(
      route.totalDistanceMeters > 4000 && route.totalDistanceMeters < 4200,
      `expected route length near 4.10 km, got ${route.totalDistanceMeters}`
    );
    assert.equal(route.cumulativeDistancesMeters.length, route.points.length);
    assert.equal(route.cumulativeDistancesMeters[0], 0);
    assert.equal(
      route.cumulativeDistancesMeters.at(-1),
      route.totalDistanceMeters
    );
  });

  it("parses a simple KML LineString and Point placemark", () => {
    const route = parseRouteFile(
      `
      <kml>
        <Document>
          <name>Imported river route</name>
          <Placemark>
            <name>Main float</name>
            <LineString>
              <coordinates>
                -116.250,46.480,0 -116.245,46.482,0 -116.240,46.484,0
              </coordinates>
            </LineString>
          </Placemark>
          <Placemark>
            <name>Take-out</name>
            <Point>
              <coordinates>-116.240,46.484,0</coordinates>
            </Point>
          </Placemark>
        </Document>
      </kml>
      `,
      "imported.kml"
    );

    assert.equal(route.name, "Main float");
    assert.equal(route.points.length, 3);
    assert.equal(route.waypoints.length, 1);
    assert.equal(route.waypoints[0].name, "Take-out");
  });
});

describe("route geometry", () => {
  it("finds the closest snapped point and preserves remaining distance math", () => {
    const route = loadSampleRoute();
    const routePoint = route.points[Math.floor(route.points.length / 2)];
    const closestPoint = findClosestPointOnRoute(
      routePoint,
      route.points,
      route.cumulativeDistancesMeters
    );

    assert.notEqual(closestPoint, null);
    if (!closestPoint) {
      throw new Error("Expected the sample route to produce a closest point.");
    }

    assert.ok(closestPoint.distanceFromRouteMeters < 1);

    const remainingMeters = remainingDistanceMeters(
      route.totalDistanceMeters,
      closestPoint.distanceAlongRouteMeters
    );
    assert.ok(Math.abs(route.totalDistanceMeters - closestPoint.distanceAlongRouteMeters - remainingMeters) < 0.001);
  });
});

describe("route matching", () => {
  it("keeps the ghost marker at the last reliable position after backward GPS noise", () => {
    const route = buildTestRoute([
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0.01 }
    ]);
    const settings = defaultRouteMatchSettings(100);
    const firstFix: LocationFix = {
      latitude: 0,
      longitude: 0.006,
      accuracyMeters: 5,
      timestampMs: 1_000
    };
    const firstUpdate = updateRouteMatch({
      route,
      fix: firstFix,
      previousMatch: createInitialRouteMatch(route),
      settings
    });

    assert.equal(firstUpdate.match.status, "On route");
    assert.equal(firstUpdate.acceptedReliableProgress, true);
    assert.ok(firstUpdate.match.progressMeters > 0);

    const backwardFix: LocationFix = {
      latitude: 0,
      longitude: 0.002,
      accuracyMeters: 5,
      timestampMs: 4_000
    };
    const backwardUpdate = updateRouteMatch({
      route,
      fix: backwardFix,
      previousMatch: firstUpdate.match,
      settings
    });

    assert.equal(backwardUpdate.match.status, "On route");
    assert.equal(backwardUpdate.acceptedReliableProgress, false);
    assert.equal(
      backwardUpdate.match.progressMeters,
      firstUpdate.match.progressMeters
    );
    assert.deepEqual(
      backwardUpdate.match.snappedPoint,
      firstUpdate.match.snappedPoint
    );
  });

  it("keeps the last reliable ghost marker when GPS is uncertain or sustained off route", () => {
    const route = buildTestRoute([
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0.01 }
    ]);
    const settings = defaultRouteMatchSettings(100);
    const reliableUpdate = updateRouteMatch({
      route,
      fix: {
        latitude: 0,
        longitude: 0.005,
        accuracyMeters: 5,
        timestampMs: 1_000
      },
      previousMatch: createInitialRouteMatch(route),
      settings
    });

    const uncertainUpdate = updateRouteMatch({
      route,
      fix: {
        latitude: 0.0004,
        longitude: 0.006,
        accuracyMeters: 5,
        timestampMs: 4_000
      },
      previousMatch: reliableUpdate.match,
      settings
    });

    assert.equal(uncertainUpdate.match.status, "GPS uncertain");
    assert.deepEqual(
      uncertainUpdate.match.snappedPoint,
      reliableUpdate.match.snappedPoint
    );

    const offRouteUpdate = updateRouteMatch({
      route,
      fix: {
        latitude: 0.001,
        longitude: 0.006,
        accuracyMeters: 5,
        timestampMs: 65_000
      },
      previousMatch: reliableUpdate.match,
      offRouteSinceMs: 1_000,
      settings
    });

    assert.equal(offRouteUpdate.match.status, "Possibly off route");
    assert.deepEqual(
      offRouteUpdate.match.snappedPoint,
      reliableUpdate.match.snappedPoint
    );
  });
});

describe("ETA", () => {
  it("estimates the sample route at roughly one hour with the default planned speed", () => {
    const route = loadSampleRoute();
    const now = new Date("2026-01-01T12:00:00Z");
    const eta = plannedSpeedEta(
      route.totalDistanceMeters,
      2.5,
      now
    );

    assert.notEqual(eta.timeRemainingMs, null);
    if (eta.timeRemainingMs === null) {
      throw new Error("Expected planned speed ETA to be available.");
    }

    const minutes = eta.timeRemainingMs / 60_000;
    assert.ok(
      minutes > 55 && minutes < 65,
      `expected about one hour, got ${minutes}`
    );
    assert.ok(eta.eta);
    assert.ok(
      Math.abs(eta.eta.getTime() - (now.getTime() + eta.timeRemainingMs)) < 1
    );
  });
});
