# River-navigation-mobile-app

## Prototype implementation

This repo contains the Expo + React Native + TypeScript prototype for **RiverNav Prototype**.

Run it with:

```bash
npm install
npm start
```

Metro is configured for the bundled GPX/KML assets. The uploaded `Planned_GPX_track.gpx` was not present in the workspace attachments, so `src/data/Planned_GPX_track.gpx` is a generated Clearwater sample with the requested route name, Put-in/Take-out waypoints, 133 track points, and an approximate 2.55 mi / 4.10 km length. Replace that file with the real uploaded GPX when available.

Build a mobile app prototype called **RiverNav Prototype**.

The app should be a simple river route-following navigation tool, not turn-by-turn road navigation. The goal is to let a user load a planned GPX/KML river float route, see that planned route over a satellite/hybrid map, see their live GPS location, see a “ghost” snapped route-position marker, and estimate remaining distance, time remaining, and ETA to the take-out.

Use the uploaded file **Planned_GPX_track.gpx** as the first bundled sample route.

The sample GPX represents a planned float on the Clearwater River. It includes:

- A route name: “Selected put-in to Selected take-out on the Clearwater River”
- A Put-in waypoint
- A Take-out waypoint
- One track segment with 133 track points
- Approximate route length: 2.55 miles / 4.10 km
- No built-in duration attribute, so use a configurable default average float speed

Use **Expo + React Native + TypeScript** for the prototype.

Recommended libraries:

- `expo-location` for live GPS tracking
- `react-native-maps` for the map view, satellite/hybrid map, route polyline, actual GPS marker, ghost marker, and waypoint markers
- `@tmcw/togeojson` or similar for parsing GPX/KML into GeoJSON
- Optional later: MapLibre React Native for offline basemaps, but do not make offline maps part of the first prototype unless easy

Core product concept:

The app should not try to give Google Maps-style turn-by-turn directions. Instead, it should show the planned river route as a visible reference line. The user can compare the route line, their actual GPS location, satellite imagery, and what they see on the river.

The most important UI idea is to show two location markers:

1. **Actual GPS marker**
   - Shows the raw phone GPS location.
   - This should use the location returned by the device.
   - It should not be force-snapped to the route.
   - This marker gives the user spatial honesty.

2. **Ghost route-position marker**
   - Shows the app’s best estimate of where the user is along the planned river route.
   - This marker should be snapped to the nearest reasonable point on the GPX/KML route.
   - It should look visually different from the actual GPS marker: semi-transparent, hollow, faded, or “ghost-like.”
   - This marker should be used for route progress, remaining distance, time remaining, and ETA calculations.

Initial app screens:

1. **Home / Route Load Screen**
   - Show the bundled sample GPX route.
   - Include a button: “Open Sample Clearwater Route.”
   - Optional: include a file import button for `.gpx` and `.kml`, but this can be second priority.
   - For the first prototype, it is acceptable to bundle `Planned_GPX_track.gpx` in the project assets and load it directly.

2. **Navigation Map Screen**
   - Show a satellite or hybrid map.
   - Draw the planned route as a clear polyline.
   - Add markers for Put-in and Take-out.
   - Show the actual GPS marker.
   - Show the ghost snapped marker.
   - Display a bottom info panel with:
     - Route name
     - Distance remaining
     - Distance completed
     - Estimated time remaining
     - ETA
     - Current observed speed
     - Route match status: “On route,” “GPS uncertain,” or “Possibly off route”

3. **Settings / Debug Panel**
   - Let the user set default average float speed in mph.
   - Default to 2.5 mph if no duration is included in the GPX/KML.
   - Let the user set route corridor tolerance, defaulting to 100 feet.
   - Show debug values:
     - GPS accuracy
     - Distance from actual GPS point to route
     - Snapped distance along route
     - Remaining route distance
     - Number of route points loaded

GPX/KML parsing requirements:

Create a route parser utility.

The parser should:

- Read a GPX or KML file as text.
- Convert it to GeoJSON or directly extract coordinates.
- Extract:
  - Route name
  - Description, if present
  - Waypoints
  - Track coordinates / route coordinates

- Return a normalized route object like:

```ts
type RoutePoint = {
  latitude: number;
  longitude: number;
};

type RouteWaypoint = {
  name: string;
  latitude: number;
  longitude: number;
};

type RiverRoute = {
  id: string;
  name: string;
  description?: string;
  points: RoutePoint[];
  waypoints: RouteWaypoint[];
  totalDistanceMeters: number;
  cumulativeDistancesMeters: number[];
};
```

For the sample GPX, the parser should identify:

- `Put-in`
- `Take-out`
- The track polyline
- The total route distance

Distance calculation requirements:

Create a geospatial utility file.

Implement:

- Haversine distance between two lat/lon points
- Total polyline distance
- Cumulative distance array along the route
- Closest point on route to current GPS point
- Distance from actual GPS point to the closest route point
- Remaining distance from snapped route position to end

For closest-point-on-route calculation:

- Iterate through each pair of route points as a segment.
- Project the GPS point onto the segment.
- Clamp the projection to the segment endpoints.
- Find the segment projection with the minimum distance to the actual GPS point.
- Return:
  - snapped latitude/longitude
  - segment index
  - fraction along segment
  - distance along route in meters
  - distance from GPS point to route in meters

Use a local planar approximation for projection. For a small river segment, it is acceptable to convert lat/lon to local x/y meters using an equirectangular approximation centered near the route. Keep the code simple and well-commented.

Ghost marker / GPS drift logic:

Do not hide GPS drift. Show both the actual GPS marker and the ghost marker.

Use this matching logic:

```text
If GPS accuracy is poor, show “GPS uncertain.”

If actual GPS point is within the route corridor:
    Update ghost marker to nearest snapped point on the route.
    Update route progress.
    Status = “On route.”

If actual GPS point is outside the route corridor but not extremely far:
    Keep showing actual GPS marker.
    Keep ghost marker at the last reliable snapped route position.
    Status = “GPS uncertain.”

If actual GPS point is far outside the corridor for a sustained period:
    Keep showing actual GPS marker.
    Keep ghost marker at last reliable snapped route position.
    Status = “Possibly off route.”
```

Suggested thresholds:

- Default route corridor: 100 feet
- If GPS accuracy is worse than 100 feet, treat status as “GPS uncertain”
- If actual GPS is more than 250 feet from the route for more than 60 seconds, show “Possibly off route”
- Make these values constants that are easy to adjust

Route progress smoothing:

River GPS can jump around. Avoid letting the route progress move backward because of GPS noise.

Implement:

- `lastReliableProgressMeters`
- Only update progress when the snapped point is within the route corridor and GPS accuracy is acceptable.
- If the new snapped progress is slightly behind the previous progress, ignore it unless the backward movement is large and sustained.
- For a downstream float, progress should usually be non-decreasing.
- Keep the code simple, but document the tradeoff.

ETA calculation:

Because the sample GPX does not contain duration, use a default average float speed.

Implement two ETA modes:

1. **Planned-speed ETA**
   - User enters average float speed in mph.
   - Default: 2.5 mph.
   - Time remaining = remaining distance / planned speed.

2. **Observed-speed ETA**
   - Calculate speed based on ghost marker progress over recent GPS updates.
   - Use a rolling window, such as the last 5 minutes.
   - Avoid using raw GPS speed directly if it is noisy.
   - If observed speed is unavailable or unrealistic, fall back to planned-speed ETA.

For the first prototype:

- Display planned-speed ETA.
- Display observed speed separately if available.
- Later, blend planned and observed speed.

For the sample route:

- Total distance is about 2.55 miles.
- At 2.5 mph, estimated total float time is about 1 hour.
- Remaining time should update as the ghost marker progresses along the route.

Map UI requirements:

On the navigation screen:

- Use satellite or hybrid basemap.
- Draw route polyline clearly.
- Show Put-in and Take-out markers.
- Show actual GPS marker with one style.
- Show ghost snapped marker with a different, semi-transparent style.
- Optionally draw a faint route corridor around the route later, but this is not required for the first version.
- Auto-fit map to the route when opened.
- Add a “follow me” button to center on actual GPS location.
- Add a “fit route” button to zoom back to the full route.

Bottom info panel:

Show:

```text
Clearwater River
2.1 mi remaining
ETA: 3:42 PM
Time remaining: 51 min
Status: On route
GPS accuracy: 28 ft
```

If GPS is uncertain:

```text
GPS uncertain
Showing last matched route position
Actual location may be drifting
```

If off route:

```text
Possibly off route
You are 320 ft from the planned route
Last matched route position shown
```

File import requirements:

First priority:

- Load the bundled sample GPX.

Second priority:

- Add “Import GPX/KML” using Expo DocumentPicker.
- Let the user select a `.gpx` or `.kml` file.
- Parse the file.
- Replace the current route with the imported route.
- Handle errors gracefully:
  - No track found
  - Invalid file
  - Too few route points
  - Unsupported format

Project structure:

```text
src/
  App.tsx
  screens/
    HomeScreen.tsx
    NavigationScreen.tsx
  components/
    RouteMap.tsx
    BottomNavPanel.tsx
    StatusBadge.tsx
  utils/
    parseRouteFile.ts
    geoMath.ts
    routeMatching.ts
    eta.ts
  data/
    Planned_GPX_track.gpx
  types/
    route.ts
```

Implementation order:

1. Create Expo React Native TypeScript app.
2. Add map screen using `react-native-maps`.
3. Bundle `Planned_GPX_track.gpx` and load it from assets.
4. Parse the GPX and extract route points and waypoints.
5. Draw the route polyline on the map.
6. Add Put-in and Take-out markers.
7. Calculate total route distance and display it.
8. Add live location permission and GPS tracking.
9. Show actual GPS marker.
10. Implement closest-point-on-route snapping.
11. Show ghost snapped marker.
12. Calculate completed distance and remaining distance.
13. Add planned-speed ETA using default speed.
14. Add route status logic: On route, GPS uncertain, Possibly off route.
15. Add simple settings/debug panel.
16. Add optional GPX/KML import.

Important design principle:

Do not overstate navigational certainty. The app should feel like a river reference tool, not a strict navigation authority. The GPX/KML line is a planned reference route, not a guarantee of safe passage. The app should include a clear disclaimer:

“River conditions, hazards, flow, channels, and obstacles can change. This route is only a planning and reference aid. Use visual judgment and local knowledge.”

Acceptance criteria:

The prototype is successful when:

- The sample Clearwater GPX route loads.
- The route appears over a satellite/hybrid map.
- Put-in and Take-out markers appear.
- The app shows the user’s live GPS position.
- The app shows a ghost marker snapped to the route.
- Distance remaining updates based on snapped route progress.
- ETA updates based on remaining distance and default/user-entered speed.
- The app distinguishes between actual GPS position and route-matched position.
- The app handles GPS drift by keeping the ghost marker at the last reliable route position when needed.
