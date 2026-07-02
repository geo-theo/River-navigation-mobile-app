import type { LocationFix, RiverRoute, RouteMatch } from "../types/route";
import {
  feetToMeters,
  findClosestPointOnRoute,
  remainingDistanceMeters
} from "./geoMath";

export const DEFAULT_ROUTE_CORRIDOR_FEET = 100;
export const POOR_GPS_ACCURACY_FEET = 100;
export const OFF_ROUTE_DISTANCE_FEET = 250;
export const OFF_ROUTE_DURATION_MS = 60 * 1000;

const BACKWARD_NOISE_TOLERANCE_METERS = 15;

export type RouteMatchSettings = {
  corridorMeters: number;
  poorGpsAccuracyMeters: number;
  offRouteDistanceMeters: number;
  offRouteDurationMs: number;
};

export type RouteMatchUpdate = {
  match: RouteMatch;
  offRouteSinceMs?: number;
  acceptedReliableProgress: boolean;
};

export function defaultRouteMatchSettings(
  corridorFeet: number
): RouteMatchSettings {
  return {
    corridorMeters: feetToMeters(corridorFeet),
    poorGpsAccuracyMeters: feetToMeters(POOR_GPS_ACCURACY_FEET),
    offRouteDistanceMeters: feetToMeters(OFF_ROUTE_DISTANCE_FEET),
    offRouteDurationMs: OFF_ROUTE_DURATION_MS
  };
}

export function createInitialRouteMatch(route: RiverRoute): RouteMatch {
  return {
    status: "GPS uncertain",
    snappedPoint: route.points[0],
    progressMeters: 0,
    remainingMeters: route.totalDistanceMeters,
    lastReliableProgressMeters: 0,
    message: "Waiting for a reliable GPS match."
  };
}

export function updateRouteMatch({
  route,
  fix,
  previousMatch,
  offRouteSinceMs,
  settings
}: {
  route: RiverRoute;
  fix: LocationFix;
  previousMatch: RouteMatch;
  offRouteSinceMs?: number;
  settings: RouteMatchSettings;
}): RouteMatchUpdate {
  const closestPoint = findClosestPointOnRoute(
    fix,
    route.points,
    route.cumulativeDistancesMeters
  );

  if (!closestPoint) {
    return {
      match: {
        ...previousMatch,
        status: "GPS uncertain",
        gpsAccuracyMeters: fix.accuracyMeters,
        message: "No usable route geometry is loaded."
      },
      offRouteSinceMs,
      acceptedReliableProgress: false
    };
  }

  const gpsAccuracyMeters = fix.accuracyMeters ?? null;
  const hasGpsAccuracy = typeof gpsAccuracyMeters === "number";
  const gpsIsPoor =
    hasGpsAccuracy && gpsAccuracyMeters > settings.poorGpsAccuracyMeters;

  if (gpsIsPoor) {
    return {
      match: {
        ...previousMatch,
        status: "GPS uncertain",
        gpsAccuracyMeters,
        distanceFromRouteMeters: closestPoint.distanceFromRouteMeters,
        message: "Showing last matched route position while GPS accuracy is poor."
      },
      offRouteSinceMs,
      acceptedReliableProgress: false
    };
  }

  if (closestPoint.distanceFromRouteMeters <= settings.corridorMeters) {
    const progressUpdate = smoothDownstreamProgress(
      previousMatch.lastReliableProgressMeters,
      closestPoint.distanceAlongRouteMeters
    );
    const progress = progressUpdate.progressMeters;

    return {
      match: {
        status: "On route",
        snappedPoint: progressUpdate.accepted
          ? closestPoint.snappedPoint
          : previousMatch.snappedPoint,
        progressMeters: progress,
        remainingMeters: remainingDistanceMeters(
          route.totalDistanceMeters,
          progress
        ),
        distanceFromRouteMeters: closestPoint.distanceFromRouteMeters,
        gpsAccuracyMeters,
        segmentIndex: progressUpdate.accepted
          ? closestPoint.segmentIndex
          : previousMatch.segmentIndex,
        fractionAlongSegment: progressUpdate.accepted
          ? closestPoint.fractionAlongSegment
          : previousMatch.fractionAlongSegment,
        lastReliableProgressMeters: progress,
        message: "Matched to the planned route corridor."
      },
      offRouteSinceMs: undefined,
      acceptedReliableProgress: progressUpdate.accepted
    };
  }

  const nowMs = fix.timestampMs;
  const outsideFarLimit =
    closestPoint.distanceFromRouteMeters > settings.offRouteDistanceMeters;
  const nextOffRouteSinceMs = outsideFarLimit
    ? offRouteSinceMs ?? nowMs
    : undefined;
  const offRouteIsSustained =
    outsideFarLimit &&
    nextOffRouteSinceMs !== undefined &&
    nowMs - nextOffRouteSinceMs >= settings.offRouteDurationMs;
  const status = offRouteIsSustained ? "Possibly off route" : "GPS uncertain";

  return {
    match: {
      ...previousMatch,
      status,
      gpsAccuracyMeters,
      distanceFromRouteMeters: closestPoint.distanceFromRouteMeters,
      message: offRouteIsSustained
        ? "Last matched route position shown."
        : "Showing last matched route position while the actual GPS point is outside the route corridor."
    },
    offRouteSinceMs: nextOffRouteSinceMs,
    acceptedReliableProgress: false
  };
}

function smoothDownstreamProgress(
  previousProgressMeters: number,
  nextProgressMeters: number
): { progressMeters: number; accepted: boolean } {
  /*
   * The prototype assumes a downstream float, so small backward jumps are
   * usually GPS noise. A future version could accept sustained backtracking
   * after several consistent updates.
   */
  const backwardDeltaMeters = previousProgressMeters - nextProgressMeters;

  if (backwardDeltaMeters > BACKWARD_NOISE_TOLERANCE_METERS) {
    return {
      progressMeters: previousProgressMeters,
      accepted: false
    };
  }

  if (backwardDeltaMeters >= 0) {
    return {
      progressMeters: previousProgressMeters,
      accepted: false
    };
  }

  return {
    progressMeters: nextProgressMeters,
    accepted: true
  };
}
