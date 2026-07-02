import type { RoutePoint } from "../types/route";

const EARTH_RADIUS_METERS = 6371008.8;
const METERS_PER_DEGREE_LATITUDE = 111320;

export const METERS_PER_MILE = 1609.344;
export const FEET_PER_METER = 3.280839895;

export type ClosestRoutePoint = {
  snappedPoint: RoutePoint;
  segmentIndex: number;
  fractionAlongSegment: number;
  distanceAlongRouteMeters: number;
  distanceFromRouteMeters: number;
};

type XYPoint = {
  x: number;
  y: number;
};

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function feetToMeters(feet: number): number {
  return feet / FEET_PER_METER;
}

export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER;
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

export function haversineDistanceMeters(a: RoutePoint, b: RoutePoint): number {
  const deltaLatitude = toRadians(b.latitude - a.latitude);
  const deltaLongitude = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(deltaLatitude / 2);
  const sinLon = Math.sin(deltaLongitude / 2);
  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function createCumulativeDistancesMeters(points: RoutePoint[]): number[] {
  if (points.length === 0) {
    return [];
  }

  const distances = [0];
  for (let index = 1; index < points.length; index += 1) {
    distances[index] =
      distances[index - 1] +
      haversineDistanceMeters(points[index - 1], points[index]);
  }

  return distances;
}

export function totalPolylineDistanceMeters(points: RoutePoint[]): number {
  const cumulativeDistances = createCumulativeDistancesMeters(points);
  return cumulativeDistances.at(-1) ?? 0;
}

export function remainingDistanceMeters(
  totalDistanceMeters: number,
  distanceAlongRouteMeters: number
): number {
  return Math.max(0, totalDistanceMeters - distanceAlongRouteMeters);
}

export function findClosestPointOnRoute(
  gpsPoint: RoutePoint,
  routePoints: RoutePoint[],
  cumulativeDistancesMeters = createCumulativeDistancesMeters(routePoints)
): ClosestRoutePoint | null {
  if (routePoints.length < 2) {
    return null;
  }

  const origin = routePoints[0];
  const gpsXY = toLocalXY(gpsPoint, origin);
  let bestMatch: ClosestRoutePoint | null = null;

  for (let index = 0; index < routePoints.length - 1; index += 1) {
    const start = routePoints[index];
    const end = routePoints[index + 1];
    const startXY = toLocalXY(start, origin);
    const endXY = toLocalXY(end, origin);

    const segmentX = endXY.x - startXY.x;
    const segmentY = endXY.y - startXY.y;
    const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

    if (segmentLengthSquared === 0) {
      continue;
    }

    const projectedFraction = clamp(
      ((gpsXY.x - startXY.x) * segmentX + (gpsXY.y - startXY.y) * segmentY) /
        segmentLengthSquared,
      0,
      1
    );

    const snappedXY = {
      x: startXY.x + segmentX * projectedFraction,
      y: startXY.y + segmentY * projectedFraction
    };
    const dx = gpsXY.x - snappedXY.x;
    const dy = gpsXY.y - snappedXY.y;
    const distanceFromRouteMeters = Math.sqrt(dx * dx + dy * dy);
    const segmentDistanceMeters =
      cumulativeDistancesMeters[index + 1] - cumulativeDistancesMeters[index];
    const distanceAlongRouteMeters =
      cumulativeDistancesMeters[index] +
      segmentDistanceMeters * projectedFraction;

    if (
      bestMatch === null ||
      distanceFromRouteMeters < bestMatch.distanceFromRouteMeters
    ) {
      bestMatch = {
        snappedPoint: fromLocalXY(snappedXY, origin),
        segmentIndex: index,
        fractionAlongSegment: projectedFraction,
        distanceAlongRouteMeters,
        distanceFromRouteMeters
      };
    }
  }

  return bestMatch;
}

function toLocalXY(point: RoutePoint, origin: RoutePoint): XYPoint {
  const latitudeRadians = toRadians(origin.latitude);
  return {
    x:
      (point.longitude - origin.longitude) *
      METERS_PER_DEGREE_LATITUDE *
      Math.cos(latitudeRadians),
    y: (point.latitude - origin.latitude) * METERS_PER_DEGREE_LATITUDE
  };
}

function fromLocalXY(point: XYPoint, origin: RoutePoint): RoutePoint {
  const latitudeRadians = toRadians(origin.latitude);
  return {
    latitude: origin.latitude + point.y / METERS_PER_DEGREE_LATITUDE,
    longitude:
      origin.longitude +
      point.x / (METERS_PER_DEGREE_LATITUDE * Math.cos(latitudeRadians))
  };
}
