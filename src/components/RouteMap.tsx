import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, type LatLng } from "react-native-maps";

import type { LocationFix, RiverRoute, RouteMatch, RoutePoint } from "../types/route";

type RouteMapProps = {
  route: RiverRoute;
  actualLocation?: LocationFix | null;
  match: RouteMatch;
  fitRequestId: number;
  followRequestId: number;
};

export function RouteMap({
  route,
  actualLocation,
  match,
  fitRequestId,
  followRequestId
}: RouteMapProps) {
  const mapRef = useRef<MapView>(null);
  const coordinates = useMemo(
    () => route.points.map(pointToLatLng),
    [route.points]
  );
  const initialRegion = useMemo(() => createRouteRegion(route.points), [route.points]);

  const fitRoute = useCallback(
    (animated = true) => {
      if (coordinates.length < 2) {
        return;
      }

      mapRef.current?.fitToCoordinates(coordinates, {
        animated,
        edgePadding: {
          top: 96,
          right: 36,
          bottom: 320,
          left: 36
        }
      });
    },
    [coordinates]
  );

  const followActualLocation = useCallback(() => {
    if (!actualLocation) {
      return;
    }

    mapRef.current?.animateCamera(
      {
        center: pointToLatLng(actualLocation),
        zoom: 16
      },
      {
        duration: 600
      }
    );
  }, [actualLocation]);

  useEffect(() => {
    if (fitRequestId > 0) {
      fitRoute();
    }
  }, [fitRequestId, fitRoute]);

  useEffect(() => {
    if (followRequestId > 0) {
      followActualLocation();
    }
  }, [followActualLocation, followRequestId]);

  return (
    <MapView
      ref={mapRef}
      initialRegion={initialRegion}
      mapType="hybrid"
      onMapReady={() => setTimeout(() => fitRoute(false), 350)}
      provider={PROVIDER_DEFAULT}
      rotateEnabled
      showsCompass
      showsMyLocationButton={false}
      showsUserLocation={false}
      style={StyleSheet.absoluteFill}
    >
      <Polyline
        coordinates={coordinates}
        lineCap="round"
        lineJoin="round"
        strokeColor="#20d6ff"
        strokeWidth={5}
      />
      <Polyline
        coordinates={coordinates}
        lineCap="round"
        lineJoin="round"
        strokeColor="rgba(255,255,255,0.72)"
        strokeWidth={2}
      />

      {route.waypoints.map((waypoint) => (
        <Marker
          coordinate={pointToLatLng(waypoint)}
          identifier={waypoint.name}
          key={`${waypoint.name}-${waypoint.latitude}-${waypoint.longitude}`}
          pinColor={waypoint.name.toLowerCase().includes("take") ? "#f05d3d" : "#1f9d55"}
          title={waypoint.name}
        />
      ))}

      {actualLocation && (
        <Marker coordinate={pointToLatLng(actualLocation)} title="Actual GPS location">
          <View style={styles.actualOuter}>
            <View style={styles.actualInner} />
          </View>
        </Marker>
      )}

      <Marker coordinate={pointToLatLng(match.snappedPoint)} title="Route-matched position">
        <View style={styles.ghostOuter}>
          <View style={styles.ghostInner} />
        </View>
      </Marker>
    </MapView>
  );
}

function pointToLatLng(point: RoutePoint): LatLng {
  return {
    latitude: point.latitude,
    longitude: point.longitude
  };
}

function createRouteRegion(points: RoutePoint[]) {
  const firstPoint = points[0] ?? {
    latitude: 46.48,
    longitude: -116.24
  };

  if (points.length < 2) {
    return {
      latitude: firstPoint.latitude,
      longitude: firstPoint.longitude,
      latitudeDelta: 0.04,
      longitudeDelta: 0.04
    };
  }

  const bounds = points.reduce(
    (acc, point) => ({
      minLatitude: Math.min(acc.minLatitude, point.latitude),
      maxLatitude: Math.max(acc.maxLatitude, point.latitude),
      minLongitude: Math.min(acc.minLongitude, point.longitude),
      maxLongitude: Math.max(acc.maxLongitude, point.longitude)
    }),
    {
      minLatitude: points[0].latitude,
      maxLatitude: points[0].latitude,
      minLongitude: points[0].longitude,
      maxLongitude: points[0].longitude
    }
  );

  return {
    latitude: (bounds.minLatitude + bounds.maxLatitude) / 2,
    longitude: (bounds.minLongitude + bounds.maxLongitude) / 2,
    latitudeDelta: Math.max(0.01, (bounds.maxLatitude - bounds.minLatitude) * 1.45),
    longitudeDelta: Math.max(0.01, (bounds.maxLongitude - bounds.minLongitude) * 1.45)
  };
}

const styles = StyleSheet.create({
  actualOuter: {
    alignItems: "center",
    backgroundColor: "rgba(23, 112, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  actualInner: {
    backgroundColor: "#176fff",
    borderColor: "#ffffff",
    borderRadius: 7,
    borderWidth: 2,
    height: 14,
    width: 14
  },
  ghostOuter: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 17,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  ghostInner: {
    backgroundColor: "rgba(32, 214, 255, 0.48)",
    borderColor: "#effcff",
    borderRadius: 8,
    borderWidth: 2,
    height: 16,
    width: 16
  }
});
