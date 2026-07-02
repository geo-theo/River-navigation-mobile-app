# RiverNav Prototype

RiverNav Prototype is an Expo + React Native + TypeScript mobile app prototype for following a planned river float route. It is a river reference tool, not turn-by-turn road navigation.

The prototype loads a bundled Clearwater River GPX route, displays the planned route over a hybrid/satellite map, shows the user's raw GPS position, shows a separate ghost marker snapped to the planned route, and estimates remaining distance, time remaining, and ETA.

## Features

- Bundled sample route: `src/data/Planned_GPX_track.gpx`
- GPX and KML parsing for imported routes
- Hybrid map on native devices with route polyline, Put-in, Take-out, actual GPS marker, and ghost route-position marker
- Web preview map fallback using SVG
- Route matching with configurable route corridor tolerance
- GPS drift handling that preserves the last reliable ghost marker when GPS is uncertain or off route
- Planned-speed ETA using a default 2.5 mph average float speed
- Observed route-progress speed over a rolling 5 minute window
- Settings/debug panel for speed, corridor tolerance, GPS accuracy, distance from route, snapped route distance, remaining distance, and point count

## Safety Disclaimer

River conditions, hazards, flow, channels, and obstacles can change. This route is only a planning and reference aid. Use visual judgment and local knowledge.

## Run

```bash
npm install
npm start
```

Useful scripts:

```bash
npm run android
npm run ios
npm run web
npm run typecheck
npm test
npm run verify
```

`npm run verify` runs TypeScript and the utility tests.

## Sample Route

The bundled sample is named "Selected put-in to Selected take-out on the Clearwater River". It includes:

- 2 waypoints: Put-in and Take-out
- 133 track points
- Approximately 2.55 miles / 4.10 km of route distance

If you have the original uploaded GPX, replace `src/data/Planned_GPX_track.gpx` with that file.

## Project Structure

```text
src/
  App.tsx
  screens/
    HomeScreen.tsx
    NavigationScreen.tsx
  components/
    RouteMap.tsx
    RouteMap.web.tsx
    BottomNavPanel.tsx
    StatusBadge.tsx
  utils/
    parseRouteFile.ts
    geoMath.ts
    routeMatching.ts
    eta.ts
    riverNavigation.test.ts
  data/
    Planned_GPX_track.gpx
  types/
    route.ts
```

## Route Matching Notes

The app keeps actual GPS and route-matched position separate:

- Actual GPS marker: the raw location returned by the device
- Ghost marker: the nearest accepted point on the planned route

If GPS accuracy is poor, the app reports "GPS uncertain" and keeps the ghost marker at the last reliable route position. If the actual GPS position is outside the route corridor but not sustained far away, the ghost marker also stays at the last reliable position. If the GPS point remains more than 250 feet from the route for over 60 seconds, the app reports "Possibly off route".

Small backward jumps in snapped progress are ignored because downstream float progress should usually be non-decreasing.
