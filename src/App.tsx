import { Asset } from "expo-asset";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import sampleRouteAsset from "./data/Planned_GPX_track.gpx";
import { HomeScreen } from "./screens/HomeScreen";
import { NavigationScreen } from "./screens/NavigationScreen";
import type { RiverRoute } from "./types/route";
import { parseRouteFile } from "./utils/parseRouteFile";

type AppScreen = "home" | "navigation";

export default function App() {
  const [screen, setScreen] = useState<AppScreen>("home");
  const [sampleRoute, setSampleRoute] = useState<RiverRoute | null>(null);
  const [activeRoute, setActiveRoute] = useState<RiverRoute | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const loadSampleRoute = useCallback(async () => {
    setIsLoadingSample(true);
    setRouteError(null);

    try {
      const asset = Asset.fromModule(sampleRouteAsset);
      await asset.downloadAsync();
      const routeText = await FileSystem.readAsStringAsync(
        asset.localUri ?? asset.uri
      );
      const route = parseRouteFile(routeText, "Planned_GPX_track.gpx");
      setSampleRoute(route);
      return route;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to load the bundled sample route.";
      setRouteError(message);
      return null;
    } finally {
      setIsLoadingSample(false);
    }
  }, []);

  useEffect(() => {
    loadSampleRoute();
  }, [loadSampleRoute]);

  const openSampleRoute = useCallback(async () => {
    const route = sampleRoute ?? (await loadSampleRoute());
    if (!route) {
      return;
    }

    setActiveRoute(route);
    setScreen("navigation");
  }, [loadSampleRoute, sampleRoute]);

  const importRoute = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: [
          "application/gpx+xml",
          "application/vnd.google-earth.kml+xml",
          "application/xml",
          "text/xml",
          "*/*"
        ]
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets[0];
      if (!file) {
        return;
      }

      const routeText = await FileSystem.readAsStringAsync(file.uri);
      const route = parseRouteFile(routeText, file.name);
      setActiveRoute(route);
      setScreen("navigation");
      setRouteError(null);
    } catch (error) {
      setRouteError(
        error instanceof Error ? error.message : "Unable to import that route."
      );
    }
  }, []);

  return (
    <View style={styles.app}>
      <StatusBar style={screen === "home" ? "light" : "dark"} />
      {screen === "navigation" && activeRoute ? (
        <NavigationScreen route={activeRoute} onBack={() => setScreen("home")} />
      ) : (
        <HomeScreen
          error={routeError}
          isLoading={isLoadingSample}
          onImportRoute={importRoute}
          onOpenSample={openSampleRoute}
          sampleRoute={sampleRoute}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1
  }
});
