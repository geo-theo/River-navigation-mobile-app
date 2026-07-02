export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteWaypoint = {
  name: string;
  latitude: number;
  longitude: number;
};

export type RiverRoute = {
  id: string;
  name: string;
  description?: string;
  points: RoutePoint[];
  waypoints: RouteWaypoint[];
  totalDistanceMeters: number;
  cumulativeDistancesMeters: number[];
};

export type RouteStatus = "On route" | "GPS uncertain" | "Possibly off route";

export type LocationFix = RoutePoint & {
  accuracyMeters?: number | null;
  speedMetersPerSecond?: number | null;
  timestampMs: number;
};

export type RouteMatch = {
  status: RouteStatus;
  snappedPoint: RoutePoint;
  progressMeters: number;
  remainingMeters: number;
  distanceFromRouteMeters?: number;
  gpsAccuracyMeters?: number | null;
  segmentIndex?: number;
  fractionAlongSegment?: number;
  lastReliableProgressMeters: number;
  message: string;
};
