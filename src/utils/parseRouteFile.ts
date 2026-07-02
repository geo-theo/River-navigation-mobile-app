import { DOMParser, type Document as XmlDocument, type Element as XmlElement } from "@xmldom/xmldom";

import type { RiverRoute, RoutePoint, RouteWaypoint } from "../types/route";
import { createCumulativeDistancesMeters } from "./geoMath";

const MIN_ROUTE_POINTS = 2;

export function parseRouteFile(text: string, sourceName = "route.gpx"): RiverRoute {
  const document = new DOMParser({
    onError: () => undefined
  }).parseFromString(text.trim(), "text/xml");

  const rootName = normalizeTagName(document.documentElement?.tagName ?? "");
  const lowerSourceName = sourceName.toLowerCase();

  if (rootName === "gpx" || lowerSourceName.endsWith(".gpx")) {
    return parseGpxDocument(document, sourceName);
  }

  if (rootName === "kml" || lowerSourceName.endsWith(".kml")) {
    return parseKmlDocument(document, sourceName);
  }

  throw new Error("Unsupported format. Choose a GPX or KML file.");
}

function parseGpxDocument(document: XmlDocument, sourceName: string): RiverRoute {
  const trackNode = firstElementByTagName(document, "trk");
  const routeNode = firstElementByTagName(document, "rte");
  const metadataNode = firstElementByTagName(document, "metadata");
  const name =
    childText(trackNode, "name") ??
    childText(routeNode, "name") ??
    childText(metadataNode, "name") ??
    "Untitled river route";
  const description =
    childText(trackNode, "desc") ??
    childText(routeNode, "desc") ??
    childText(metadataNode, "desc");

  const waypoints = elementsByTagName(document, "wpt")
    .map((waypointNode, index) => parseGpxWaypoint(waypointNode, index))
    .filter((waypoint): waypoint is RouteWaypoint => waypoint !== null);

  let points = elementsByTagName(document, "trkpt")
    .map(parsePointAttributes)
    .filter((point): point is RoutePoint => point !== null);

  if (points.length < MIN_ROUTE_POINTS) {
    points = elementsByTagName(document, "rtept")
      .map(parsePointAttributes)
      .filter((point): point is RoutePoint => point !== null);
  }

  return buildRoute({
    sourceName,
    name,
    description,
    points,
    waypoints
  });
}

function parseKmlDocument(document: XmlDocument, sourceName: string): RiverRoute {
  const documentName =
    childText(document.documentElement, "name") ?? "Untitled river route";
  const documentDescription = childText(document.documentElement, "description");
  const placemarks = elementsByTagName(document, "Placemark");
  const waypoints: RouteWaypoint[] = [];
  let routeName = documentName;
  let description = documentDescription;
  let bestLine: RoutePoint[] = [];

  placemarks.forEach((placemark, placemarkIndex) => {
    const placemarkName = childText(placemark, "name");
    const placemarkDescription = childText(placemark, "description");
    const lineStrings = elementsByTagName(placemark, "LineString");
    const pointNodes = elementsByTagName(placemark, "Point");

    lineStrings.forEach((lineString) => {
      const coordinatesText = childText(lineString, "coordinates");
      const coordinates = parseKmlCoordinates(coordinatesText ?? "");
      if (coordinates.length > bestLine.length) {
        bestLine = coordinates;
        routeName = placemarkName ?? documentName;
        description = placemarkDescription ?? documentDescription;
      }
    });

    pointNodes.forEach((pointNode, pointIndex) => {
      const coordinatesText = childText(pointNode, "coordinates");
      const [point] = parseKmlCoordinates(coordinatesText ?? "");
      if (point) {
        waypoints.push({
          name:
            placemarkName ??
            `Waypoint ${placemarkIndex + 1}.${pointIndex + 1}`,
          latitude: point.latitude,
          longitude: point.longitude
        });
      }
    });
  });

  return buildRoute({
    sourceName,
    name: routeName,
    description,
    points: bestLine,
    waypoints
  });
}

function buildRoute({
  sourceName,
  name,
  description,
  points,
  waypoints
}: {
  sourceName: string;
  name: string;
  description?: string;
  points: RoutePoint[];
  waypoints: RouteWaypoint[];
}): RiverRoute {
  if (points.length < MIN_ROUTE_POINTS) {
    throw new Error("No track found. A route needs at least two points.");
  }

  const cumulativeDistancesMeters = createCumulativeDistancesMeters(points);
  const totalDistanceMeters = cumulativeDistancesMeters.at(-1) ?? 0;

  return {
    id: createRouteId(name, sourceName, points.length, totalDistanceMeters),
    name,
    description,
    points,
    waypoints,
    totalDistanceMeters,
    cumulativeDistancesMeters
  };
}

function parseGpxWaypoint(
  waypointNode: XmlElement,
  index: number
): RouteWaypoint | null {
  const point = parsePointAttributes(waypointNode);
  if (!point) {
    return null;
  }

  return {
    name: childText(waypointNode, "name") ?? `Waypoint ${index + 1}`,
    latitude: point.latitude,
    longitude: point.longitude
  };
}

function parsePointAttributes(element: XmlElement): RoutePoint | null {
  const latitude = Number(element.getAttribute("lat"));
  const longitude = Number(element.getAttribute("lon"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    latitude,
    longitude
  };
}

function parseKmlCoordinates(coordinatesText: string): RoutePoint[] {
  return coordinatesText
    .trim()
    .split(/\s+/)
    .map((coordinate) => {
      const [longitudeText, latitudeText] = coordinate.split(",");
      const longitude = Number(longitudeText);
      const latitude = Number(latitudeText);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return {
        latitude,
        longitude
      };
    })
    .filter((point): point is RoutePoint => point !== null);
}

function elementsByTagName(
  parent: XmlDocument | XmlElement,
  tagName: string
): XmlElement[] {
  return Array.from(parent.getElementsByTagName(tagName)) as XmlElement[];
}

function firstElementByTagName(
  parent: XmlDocument | XmlElement,
  tagName: string
): XmlElement | undefined {
  return elementsByTagName(parent, tagName)[0];
}

function childText(
  parent: XmlDocument | XmlElement | undefined | null,
  tagName: string
): string | undefined {
  if (!parent) {
    return undefined;
  }

  for (let index = 0; index < parent.childNodes.length; index += 1) {
    const child = parent.childNodes.item(index);
    if (!child) {
      continue;
    }

    if (
      child.nodeType === 1 &&
      normalizeTagName(child.nodeName) === normalizeTagName(tagName)
    ) {
      const value = child.textContent?.trim();
      return value === "" ? undefined : value;
    }
  }

  return undefined;
}

function normalizeTagName(tagName: string): string {
  return tagName.split(":").at(-1)?.toLowerCase() ?? tagName.toLowerCase();
}

function createRouteId(
  name: string,
  sourceName: string,
  pointsCount: number,
  totalDistanceMeters: number
): string {
  const slug = `${sourceName}-${name}`
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return `${slug}-${pointsCount}-${Math.round(totalDistanceMeters)}`;
}
