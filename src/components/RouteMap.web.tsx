import { createElement, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as L from "leaflet";
import { StyleSheet, Text, View } from "react-native";

import type { LocationFix, RiverRoute, RouteMatch, RoutePoint } from "../types/route";

type RouteMapProps = {
  route: RiverRoute;
  actualLocation?: LocationFix | null;
  match: RouteMatch;
  fitRequestId: number;
  followRequestId: number;
};

type LayerRefs = {
  routeGroup?: L.LayerGroup;
  actualMarker?: L.Marker;
  ghostMarker?: L.Marker;
};

const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const LEAFLET_STYLE_ID = "rivernav-leaflet-web-styles";
const ROUTE_FIT_PADDING_TOP = 92;
const ROUTE_FIT_PADDING_SIDE = 80;
const ROUTE_FIT_PADDING_BOTTOM = 92;
const ROTATED_MAP_SCALE = 1.62;

export function RouteMap({
  route,
  actualLocation,
  match,
  fitRequestId,
  followRequestId
}: RouteMapProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const interactionHostRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRefs = useRef<LayerRefs>({});
  const [mapReady, setMapReady] = useState(false);
  const coordinates = useMemo(() => route.points.map(pointToLatLng), [route.points]);
  const routeBearingDegrees = useMemo(
    () => calculateRouteBearingDegrees(route.points),
    [route.points]
  );
  const rotatedMapStyle = useMemo<CSSProperties>(
    () => ({
      height: `${ROTATED_MAP_SCALE * 100}%`,
      left: `${((1 - ROTATED_MAP_SCALE) / 2) * 100}%`,
      position: "absolute",
      top: `${((1 - ROTATED_MAP_SCALE) / 2) * 100}%`,
      transform: `rotate(${-routeBearingDegrees}deg)`,
      transformOrigin: "50% 50%",
      width: `${ROTATED_MAP_SCALE * 100}%`
    }),
    [routeBearingDegrees]
  );

  useEffect(() => {
    ensureLeafletWebStyles();
  }, []);

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapElementRef.current, {
      attributionControl: false,
      dragging: false,
      keyboard: false,
      preferCanvas: true,
      zoomControl: false
    });

    L.tileLayer(ESRI_IMAGERY_URL, {
      maxNativeZoom: 19,
      maxZoom: 21
    }).addTo(map);

    mapRef.current = map;
    setMapReady(true);

    return () => {
      Object.values(layerRefs.current).forEach((layer) => layer?.remove());
      layerRefs.current = {};
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const host = interactionHostRef.current;
    if (!mapReady || !map || !host) {
      return;
    }

    const activeMap = map;
    const activeHost = host;
    let isDragging = false;
    let lastClientX = 0;
    let lastClientY = 0;

    const routeBearingRadians = toRadians(routeBearingDegrees);
    const cosBearing = Math.cos(routeBearingRadians);
    const sinBearing = Math.sin(routeBearingRadians);

    function handlePointerDown(event: PointerEvent) {
      if (event.button !== 0) {
        return;
      }

      isDragging = true;
      lastClientX = event.clientX;
      lastClientY = event.clientY;
      activeHost.setPointerCapture(event.pointerId);
      activeHost.classList.add("rivernav-leaflet-host-dragging");
      event.preventDefault();
    }

    function handlePointerMove(event: PointerEvent) {
      if (!isDragging) {
        return;
      }

      const screenDeltaX = event.clientX - lastClientX;
      const screenDeltaY = event.clientY - lastClientY;
      lastClientX = event.clientX;
      lastClientY = event.clientY;

      const leafletDeltaX =
        screenDeltaX * cosBearing - screenDeltaY * sinBearing;
      const leafletDeltaY =
        screenDeltaX * sinBearing + screenDeltaY * cosBearing;

      activeMap.panBy([-leafletDeltaX, -leafletDeltaY], {
        animate: false
      });
      event.preventDefault();
    }

    function endPointerDrag(event: PointerEvent) {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      if (activeHost.hasPointerCapture(event.pointerId)) {
        activeHost.releasePointerCapture(event.pointerId);
      }
      activeHost.classList.remove("rivernav-leaflet-host-dragging");
    }

    activeHost.addEventListener("pointerdown", handlePointerDown);
    activeHost.addEventListener("pointermove", handlePointerMove);
    activeHost.addEventListener("pointerup", endPointerDrag);
    activeHost.addEventListener("pointercancel", endPointerDrag);
    activeHost.addEventListener("lostpointercapture", endPointerDrag);

    return () => {
      activeHost.removeEventListener("pointerdown", handlePointerDown);
      activeHost.removeEventListener("pointermove", handlePointerMove);
      activeHost.removeEventListener("pointerup", endPointerDrag);
      activeHost.removeEventListener("pointercancel", endPointerDrag);
      activeHost.removeEventListener("lostpointercapture", endPointerDrag);
      activeHost.classList.remove("rivernav-leaflet-host-dragging");
    };
  }, [mapReady, routeBearingDegrees]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    layerRefs.current.routeGroup?.remove();

    const routeGroup = L.layerGroup().addTo(map);

    L.polyline(coordinates, {
      color: "#04242d",
      lineCap: "round",
      lineJoin: "round",
      opacity: 0.82,
      weight: 16
    }).addTo(routeGroup);
    L.polyline(coordinates, {
      color: "#20d6ff",
      lineCap: "round",
      lineJoin: "round",
      opacity: 0.98,
      weight: 8
    }).addTo(routeGroup);
    L.polyline(coordinates, {
      color: "#f7fbf7",
      lineCap: "round",
      lineJoin: "round",
      opacity: 0.78,
      weight: 2.5
    }).addTo(routeGroup);

    route.waypoints.forEach((waypoint) => {
      L.marker(pointToLatLng(waypoint), {
        icon: createWaypointIcon(waypoint.name),
        interactive: false,
        keyboard: false
      }).addTo(routeGroup);
    });

    layerRefs.current.routeGroup = routeGroup;
    window.setTimeout(() => {
      map.invalidateSize();
      fitRouteToMap(map, coordinates, false);
    }, 0);
  }, [coordinates, mapReady, route.id, route.waypoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || fitRequestId === 0) {
      return;
    }

    fitRouteToMap(map, coordinates);
  }, [coordinates, fitRequestId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map || followRequestId === 0 || !actualLocation) {
      return;
    }

    map.panTo(pointToLatLng(actualLocation), {
      animate: true,
      duration: 0.55
    });
  }, [actualLocation, followRequestId, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    layerRefs.current.ghostMarker?.remove();
    layerRefs.current.ghostMarker = L.marker(pointToLatLng(match.snappedPoint), {
      icon: createGhostIcon(),
      interactive: false,
      keyboard: false
    }).addTo(map);
  }, [mapReady, match.snappedPoint.latitude, match.snappedPoint.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    layerRefs.current.actualMarker?.remove();
    layerRefs.current.actualMarker = actualLocation
      ? L.marker(pointToLatLng(actualLocation), {
          icon: createActualIcon(),
          interactive: false,
          keyboard: false
        }).addTo(map)
      : undefined;
  }, [actualLocation, mapReady]);

  return (
    <View style={styles.map}>
      {createElement(
        "div",
        {
          className: "rivernav-leaflet-host",
          ref: interactionHostRef,
          style: leafletHostStyle
        },
        createElement(
          "div",
          {
            className: "rivernav-leaflet-rotated",
            style: rotatedMapStyle
          },
          createElement("div", {
            ref: mapElementRef,
            style: leafletCanvasStyle
          })
        )
      )}

      <View pointerEvents="none" style={styles.imageryBadge}>
        <Text style={styles.imageryBadgeText}>Esri World Imagery</Text>
      </View>
    </View>
  );
}

function fitRouteToMap(
  map: L.Map,
  coordinates: L.LatLngExpression[],
  animated = true
): void {
  if (coordinates.length < 2) {
    return;
  }

  map.fitBounds(L.latLngBounds(coordinates), {
    animate: animated,
    maxZoom: 16,
    paddingBottomRight: [ROUTE_FIT_PADDING_SIDE, ROUTE_FIT_PADDING_BOTTOM],
    paddingTopLeft: [ROUTE_FIT_PADDING_SIDE, ROUTE_FIT_PADDING_TOP]
  });
}

function pointToLatLng(point: RoutePoint): L.LatLngExpression {
  return [point.latitude, point.longitude];
}

function calculateRouteBearingDegrees(points: RoutePoint[]): number {
  if (points.length < 2) {
    return 0;
  }

  const start = points[0];
  const end = points[points.length - 1];
  const startLatitude = toRadians(start.latitude);
  const endLatitude = toRadians(end.latitude);
  const deltaLongitude = toRadians(end.longitude - start.longitude);
  const y = Math.sin(deltaLongitude) * Math.cos(endLatitude);
  const x =
    Math.cos(startLatitude) * Math.sin(endLatitude) -
    Math.sin(startLatitude) * Math.cos(endLatitude) * Math.cos(deltaLongitude);

  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

function createWaypointIcon(name: string): L.DivIcon {
  const isTakeOut = name.toLowerCase().includes("take");

  return L.divIcon({
    className: "rivernav-leaflet-icon-shell",
    html: `<span class="rivernav-waypoint ${
      isTakeOut ? "rivernav-waypoint-takeout" : "rivernav-waypoint-putin"
    }"></span>`,
    iconAnchor: [15, 15],
    iconSize: [30, 30]
  });
}

function createActualIcon(): L.DivIcon {
  return L.divIcon({
    className: "rivernav-leaflet-icon-shell",
    html: '<span class="rivernav-actual-marker"><span></span></span>',
    iconAnchor: [18, 18],
    iconSize: [36, 36]
  });
}

function createGhostIcon(): L.DivIcon {
  return L.divIcon({
    className: "rivernav-leaflet-icon-shell",
    html: '<span class="rivernav-ghost-marker"><span></span></span>',
    iconAnchor: [17, 17],
    iconSize: [34, 34]
  });
}

function ensureLeafletWebStyles(): void {
  if (typeof document === "undefined" || document.getElementById(LEAFLET_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = LEAFLET_STYLE_ID;
  style.textContent = `
    .rivernav-leaflet-host .leaflet-container {
      cursor: grab;
      font-family: inherit;
      overflow: hidden;
      touch-action: none;
    }

    .rivernav-leaflet-host-dragging .leaflet-container {
      cursor: grabbing;
    }

    .rivernav-leaflet-host .leaflet-pane,
    .rivernav-leaflet-host .leaflet-tile,
    .rivernav-leaflet-host .leaflet-marker-icon,
    .rivernav-leaflet-host .leaflet-marker-shadow,
    .rivernav-leaflet-host .leaflet-tile-container,
    .rivernav-leaflet-host .leaflet-pane > svg,
    .rivernav-leaflet-host .leaflet-pane > canvas,
    .rivernav-leaflet-host .leaflet-layer {
      left: 0;
      position: absolute;
      top: 0;
    }

    .rivernav-leaflet-host {
      bottom: clamp(220px, 36vh, 320px);
    }

    @media (min-width: 640px) {
      .rivernav-leaflet-host {
        bottom: 210px;
      }
    }

    .rivernav-leaflet-host .leaflet-tile-pane {
      z-index: 200;
    }

    .rivernav-leaflet-host .leaflet-overlay-pane {
      z-index: 400;
    }

    .rivernav-leaflet-host .leaflet-shadow-pane {
      z-index: 500;
    }

    .rivernav-leaflet-host .leaflet-marker-pane {
      z-index: 600;
    }

    .rivernav-leaflet-host .leaflet-tile,
    .rivernav-leaflet-host .leaflet-marker-icon,
    .rivernav-leaflet-host .leaflet-marker-shadow {
      max-height: none !important;
      max-width: none !important;
      user-select: none;
    }

    .rivernav-leaflet-host .leaflet-tile {
      border: 0;
      filter: saturate(1.08) contrast(1.04);
      visibility: hidden;
    }

    .rivernav-leaflet-host .leaflet-tile-loaded {
      visibility: inherit;
    }

    .rivernav-leaflet-host .leaflet-zoom-animated {
      transform-origin: 0 0;
    }

    .rivernav-leaflet-host .leaflet-interactive {
      cursor: pointer;
    }

    .rivernav-leaflet-host .leaflet-overlay-pane svg {
      max-height: none !important;
      max-width: none !important;
    }

    .rivernav-leaflet-host .leaflet-container {
      background: #071014;
      height: 100%;
      width: 100%;
    }

    .rivernav-leaflet-icon-shell {
      background: transparent;
      border: 0;
    }

    .rivernav-waypoint,
    .rivernav-actual-marker,
    .rivernav-ghost-marker {
      align-items: center;
      border-radius: 999px;
      box-sizing: border-box;
      display: flex;
      justify-content: center;
    }

    .rivernav-waypoint {
      border: 4px solid #f7fbf7;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.42);
      height: 30px;
      width: 30px;
    }

    .rivernav-waypoint-putin {
      background: #32c9c5;
    }

    .rivernav-waypoint-takeout {
      background: #f05d3d;
    }

    .rivernav-actual-marker {
      background: rgba(23, 112, 255, 0.18);
      border: 2px solid rgba(255, 255, 255, 0.9);
      height: 36px;
      width: 36px;
    }

    .rivernav-actual-marker span {
      background: #176fff;
      border: 2px solid #ffffff;
      border-radius: 999px;
      height: 14px;
      width: 14px;
    }

    .rivernav-ghost-marker {
      background: rgba(255, 255, 255, 0.18);
      border: 2px dashed rgba(255, 255, 255, 0.92);
      height: 34px;
      width: 34px;
    }

    .rivernav-ghost-marker span {
      background: rgba(32, 214, 255, 0.55);
      border: 2px solid #effcff;
      border-radius: 999px;
      height: 16px;
      width: 16px;
    }
  `;
  document.head.appendChild(style);
}

const leafletHostStyle: CSSProperties = {
  backgroundColor: "#071014",
  overflow: "hidden",
  left: 0,
  position: "absolute",
  right: 0,
  top: 0
};

const leafletCanvasStyle: CSSProperties = {
  height: "100%",
  width: "100%"
};

const styles = StyleSheet.create({
  map: {
    backgroundColor: "#071014",
    flex: 1,
    overflow: "hidden"
  },
  imageryBadge: {
    backgroundColor: "rgba(247, 251, 247, 0.92)",
    borderRadius: 8,
    bottom: 288,
    left: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    position: "absolute"
  },
  imageryBadgeText: {
    color: "#0b3038",
    fontSize: 12,
    fontWeight: "800"
  }
});
