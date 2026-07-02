import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Polyline, Rect } from "react-native-svg";

import type { LocationFix, RiverRoute, RouteMatch, RoutePoint } from "../types/route";

type RouteMapProps = {
  route: RiverRoute;
  actualLocation?: LocationFix | null;
  match: RouteMatch;
  fitRequestId: number;
  followRequestId: number;
};

type ProjectedPoint = {
  x: number;
  y: number;
};

const VIEWBOX_SIZE = 1000;
const VIEWBOX_PADDING = 80;

export function RouteMap({
  route,
  actualLocation,
  match
}: RouteMapProps) {
  const projection = useMemo(() => createProjection(route.points), [route.points]);
  const routePoints = useMemo(
    () => route.points.map(projection.project),
    [projection, route.points]
  );
  const routePolyline = useMemo(() => toPolylinePoints(routePoints), [routePoints]);
  const waypointPoints = useMemo(
    () =>
      route.waypoints.map((waypoint) => ({
        ...projection.project(waypoint),
        name: waypoint.name
      })),
    [projection, route.waypoints]
  );
  const actualPoint = actualLocation ? projection.project(actualLocation) : null;
  const matchedPoint = projection.project(match.snappedPoint);

  return (
    <View style={styles.map}>
      <Svg
        preserveAspectRatio="xMidYMid meet"
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
      >
        <Rect fill="#0a1a1d" height={VIEWBOX_SIZE} width={VIEWBOX_SIZE} x={0} y={0} />
        <Polyline
          fill="none"
          points={routePolyline}
          stroke="#164b55"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={26}
        />
        <Polyline
          fill="none"
          points={routePolyline}
          stroke="#20d6ff"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={10}
        />
        <Polyline
          fill="none"
          points={routePolyline}
          stroke="rgba(255,255,255,0.78)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={3}
        />

        {waypointPoints.map((waypoint) => (
          <Circle
            cx={waypoint.x}
            cy={waypoint.y}
            fill={waypoint.name.toLowerCase().includes("take") ? "#f05d3d" : "#1f9d55"}
            key={`${waypoint.name}-${waypoint.x}-${waypoint.y}`}
            r={16}
            stroke="#f7fbf7"
            strokeWidth={5}
          />
        ))}

        <Circle
          cx={matchedPoint.x}
          cy={matchedPoint.y}
          fill="rgba(32, 214, 255, 0.55)"
          r={19}
          stroke="#effcff"
          strokeDasharray="8 7"
          strokeWidth={5}
        />

        {actualPoint && (
          <Circle
            cx={actualPoint.x}
            cy={actualPoint.y}
            fill="#176fff"
            r={15}
            stroke="#ffffff"
            strokeWidth={6}
          />
        )}
      </Svg>

      <View pointerEvents="none" style={styles.webBadge}>
        <Text style={styles.webBadgeText}>Web preview map</Text>
      </View>
    </View>
  );
}

function createProjection(points: RoutePoint[]) {
  const firstPoint = points[0] ?? {
    latitude: 46.48,
    longitude: -116.24
  };
  const bounds = points.reduce(
    (acc, point) => ({
      minLatitude: Math.min(acc.minLatitude, point.latitude),
      maxLatitude: Math.max(acc.maxLatitude, point.latitude),
      minLongitude: Math.min(acc.minLongitude, point.longitude),
      maxLongitude: Math.max(acc.maxLongitude, point.longitude)
    }),
    {
      minLatitude: firstPoint.latitude,
      maxLatitude: firstPoint.latitude,
      minLongitude: firstPoint.longitude,
      maxLongitude: firstPoint.longitude
    }
  );
  const latitudeSpan = Math.max(0.000001, bounds.maxLatitude - bounds.minLatitude);
  const longitudeSpan = Math.max(0.000001, bounds.maxLongitude - bounds.minLongitude);
  const drawableSize = VIEWBOX_SIZE - VIEWBOX_PADDING * 2;

  return {
    project(point: RoutePoint): ProjectedPoint {
      return {
        x:
          VIEWBOX_PADDING +
          ((point.longitude - bounds.minLongitude) / longitudeSpan) * drawableSize,
        y:
          VIEWBOX_PADDING +
          ((bounds.maxLatitude - point.latitude) / latitudeSpan) * drawableSize
      };
    }
  };
}

function toPolylinePoints(points: ProjectedPoint[]): string {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

const styles = StyleSheet.create({
  map: {
    backgroundColor: "#0a1a1d",
    flex: 1
  },
  webBadge: {
    backgroundColor: "rgba(247, 251, 247, 0.92)",
    borderRadius: 8,
    bottom: 288,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute"
  },
  webBadgeText: {
    color: "#0b3038",
    fontSize: 12,
    fontWeight: "800"
  }
});
