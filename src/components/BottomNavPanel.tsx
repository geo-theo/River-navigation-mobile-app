import { Settings } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { RiverRoute, RouteMatch } from "../types/route";
import { formatDistance, formatDuration, formatEta, formatSpeed, type PlannedEta } from "../utils/eta";
import { metersToFeet } from "../utils/geoMath";
import { StatusBadge } from "./StatusBadge";

type BottomNavPanelProps = {
  route: RiverRoute;
  match: RouteMatch;
  plannedEta: PlannedEta;
  observedSpeedMph: number | null;
  onOpenSettings: () => void;
};

export function BottomNavPanel({
  route,
  match,
  plannedEta,
  observedSpeedMph,
  onOpenSettings
}: BottomNavPanelProps) {
  const displayRouteName = route.name.toLowerCase().includes("clearwater")
    ? "Clearwater River"
    : route.name;

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {displayRouteName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {route.name}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Open settings and debug panel"
          onPress={onOpenSettings}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressedButton
          ]}
        >
          <Settings color="#10343e" size={20} strokeWidth={2.4} />
        </Pressable>
      </View>

      <View style={styles.primaryRow}>
        <View>
          <Text style={styles.metricValue}>{formatDistance(match.remainingMeters)}</Text>
          <Text style={styles.metricLabel}>remaining</Text>
        </View>
        <View>
          <Text style={styles.metricValue}>{formatEta(plannedEta.eta)}</Text>
          <Text style={styles.metricLabel}>ETA</Text>
        </View>
        <View>
          <Text style={styles.metricValue}>{formatDuration(plannedEta.timeRemainingMs)}</Text>
          <Text style={styles.metricLabel}>time</Text>
        </View>
      </View>

      <View style={styles.secondaryGrid}>
        <InfoItem label="Completed" value={formatDistance(match.progressMeters)} />
        <InfoItem label="Observed speed" value={formatSpeed(observedSpeedMph)} />
        <InfoItem
          label="GPS accuracy"
          value={
            typeof match.gpsAccuracyMeters === "number"
              ? `${Math.round(metersToFeet(match.gpsAccuracyMeters))} ft`
              : "Waiting"
          }
        />
      </View>

      <View style={styles.statusRow}>
        <StatusBadge status={match.status} />
        <View style={styles.statusCopy}>
          <Text style={styles.statusText}>{match.message}</Text>
          {match.status === "Possibly off route" && (
            <Text style={styles.warningText}>
              You are {Math.round(metersToFeet(match.distanceFromRouteMeters ?? 0))} ft from the planned route.
            </Text>
          )}
          {match.status === "GPS uncertain" && (
            <Text style={styles.warningText}>
              Actual location may be drifting.
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.disclaimer}>
        River conditions, hazards, flow, channels, and obstacles can change. This route is only a planning and reference aid. Use visual judgment and local knowledge.
      </Text>
    </View>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoItem}>
      <Text style={styles.infoValue}>{value}</Text>
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: "#f7fbf7",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    bottom: 0,
    left: 0,
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 14,
    position: "absolute",
    right: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -4
    },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 16
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between"
  },
  titleWrap: {
    flex: 1
  },
  title: {
    color: "#082c35",
    fontSize: 20,
    fontWeight: "800"
  },
  subtitle: {
    color: "#58717a",
    fontSize: 12,
    marginTop: 2
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#dfeeed",
    borderRadius: 8,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  pressedButton: {
    opacity: 0.72
  },
  primaryRow: {
    borderBottomColor: "#d8e5e4",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#d8e5e4",
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
    paddingVertical: 12
  },
  metricValue: {
    color: "#062c35",
    fontSize: 19,
    fontWeight: "800"
  },
  metricLabel: {
    color: "#65777d",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase"
  },
  secondaryGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12
  },
  infoItem: {
    flex: 1
  },
  infoValue: {
    color: "#133941",
    fontSize: 14,
    fontWeight: "700"
  },
  infoLabel: {
    color: "#6d7f84",
    fontSize: 11,
    marginTop: 2
  },
  statusRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  statusCopy: {
    flex: 1
  },
  statusText: {
    color: "#153d46",
    fontSize: 13,
    lineHeight: 18
  },
  warningText: {
    color: "#566d73",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
  },
  disclaimer: {
    color: "#6a7c80",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 12
  }
});
