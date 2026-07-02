import { FileUp, Map, Navigation } from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

import type { RiverRoute } from "../types/route";
import { formatDistance } from "../utils/eta";

type HomeScreenProps = {
  sampleRoute: RiverRoute | null;
  isLoading: boolean;
  error?: string | null;
  onOpenSample: () => void;
  onImportRoute: () => void;
};

export function HomeScreen({
  sampleRoute,
  isLoading,
  error,
  onOpenSample,
  onImportRoute
}: HomeScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Navigation color="#f7fbf7" size={24} strokeWidth={2.4} />
          </View>
          <View>
            <Text style={styles.eyebrow}>River reference navigation</Text>
            <Text style={styles.title}>RiverNav Prototype</Text>
          </View>
        </View>

        <View style={styles.routePanel}>
          <View style={styles.routePanelHeader}>
            <View>
              <Text style={styles.panelLabel}>Bundled route</Text>
              <Text style={styles.routeTitle}>
                {sampleRoute?.name ?? "Selected put-in to Selected take-out on the Clearwater River"}
              </Text>
            </View>
            <Map color="#2a6673" size={26} strokeWidth={2.2} />
          </View>

          {isLoading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#1d7585" />
              <Text style={styles.loadingText}>Loading sample GPX</Text>
            </View>
          )}

          {error && <Text style={styles.errorText}>{error}</Text>}

          {sampleRoute && (
            <View style={styles.statsRow}>
              <Stat label="Distance" value={formatDistance(sampleRoute.totalDistanceMeters)} />
              <Stat label="Track points" value={`${sampleRoute.points.length}`} />
              <Stat label="Waypoints" value={`${sampleRoute.waypoints.length}`} />
            </View>
          )}

          <Pressable
            disabled={isLoading}
            onPress={onOpenSample}
            style={({ pressed }) => [
              styles.primaryButton,
              (pressed || isLoading) && styles.pressedButton
            ]}
          >
            <Navigation color="#f8fcfb" size={19} strokeWidth={2.4} />
            <Text style={styles.primaryButtonText}>Open Sample Clearwater Route</Text>
          </Pressable>

          <Pressable
            onPress={onImportRoute}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressedButton
            ]}
          >
            <FileUp color="#123f49" size={19} strokeWidth={2.3} />
            <Text style={styles.secondaryButtonText}>Import GPX/KML</Text>
          </Pressable>
        </View>

        <View style={styles.disclaimerPanel}>
          <Text style={styles.disclaimerTitle}>Planning aid only</Text>
          <Text style={styles.disclaimerText}>
            River conditions, hazards, flow, channels, and obstacles can change. This route is only a planning and reference aid. Use visual judgment and local knowledge.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#071014",
    flex: 1
  },
  container: {
    flexGrow: 1,
    gap: 18,
    justifyContent: "center",
    padding: 22
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14
  },
  brandIcon: {
    alignItems: "center",
    backgroundColor: "#167383",
    borderRadius: 8,
    height: 54,
    justifyContent: "center",
    width: 54
  },
  eyebrow: {
    color: "#9fc4c9",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: "#f7fbf7",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 2
  },
  routePanel: {
    backgroundColor: "#f7fbf7",
    borderRadius: 8,
    gap: 16,
    padding: 18
  },
  routePanelHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between"
  },
  panelLabel: {
    color: "#6c7f84",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  routeTitle: {
    color: "#092c35",
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 26,
    marginTop: 5
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  loadingText: {
    color: "#47656b",
    fontSize: 14
  },
  errorText: {
    color: "#9d2b1e",
    fontSize: 14,
    lineHeight: 20
  },
  statsRow: {
    backgroundColor: "#e8f1ef",
    borderRadius: 8,
    flexDirection: "row",
    padding: 12
  },
  stat: {
    flex: 1
  },
  statValue: {
    color: "#0c353e",
    fontSize: 18,
    fontWeight: "800"
  },
  statLabel: {
    color: "#61787d",
    fontSize: 11,
    marginTop: 2,
    textTransform: "uppercase"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#116d7e",
    borderRadius: 8,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 14
  },
  primaryButtonText: {
    color: "#f8fcfb",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#dceceb",
    borderRadius: 8,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14
  },
  secondaryButtonText: {
    color: "#123f49",
    fontSize: 15,
    fontWeight: "800"
  },
  pressedButton: {
    opacity: 0.74
  },
  disclaimerPanel: {
    borderColor: "#33565d",
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16
  },
  disclaimerTitle: {
    color: "#f0f7f6",
    fontSize: 14,
    fontWeight: "800"
  },
  disclaimerText: {
    color: "#adc5c8",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6
  }
});
