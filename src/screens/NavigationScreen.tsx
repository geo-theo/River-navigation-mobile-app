import { ArrowLeft, Crosshair, Maximize2, Save, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import * as Location from "expo-location";

import { BottomNavPanel } from "../components/BottomNavPanel";
import { RouteMap } from "../components/RouteMap";
import type { LocationFix, RiverRoute, RouteMatch } from "../types/route";
import {
  DEFAULT_AVERAGE_FLOAT_SPEED_MPH,
  computeObservedSpeedMph,
  formatDistance,
  plannedSpeedEta,
  trimProgressSamples,
  type ProgressSample
} from "../utils/eta";
import { metersToFeet } from "../utils/geoMath";
import {
  DEFAULT_ROUTE_CORRIDOR_FEET,
  createInitialRouteMatch,
  defaultRouteMatchSettings,
  updateRouteMatch
} from "../utils/routeMatching";

type NavigationScreenProps = {
  route: RiverRoute;
  onBack: () => void;
};

export function NavigationScreen({ route, onBack }: NavigationScreenProps) {
  const [actualLocation, setActualLocation] = useState<LocationFix | null>(null);
  const [match, setMatch] = useState<RouteMatch>(() => createInitialRouteMatch(route));
  const [locationError, setLocationError] = useState<string | null>(null);
  const [fitRequestId, setFitRequestId] = useState(0);
  const [followRequestId, setFollowRequestId] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [averageSpeedMph, setAverageSpeedMph] = useState(DEFAULT_AVERAGE_FLOAT_SPEED_MPH);
  const [corridorFeet, setCorridorFeet] = useState(DEFAULT_ROUTE_CORRIDOR_FEET);
  const [speedInput, setSpeedInput] = useState(`${DEFAULT_AVERAGE_FLOAT_SPEED_MPH}`);
  const [corridorInput, setCorridorInput] = useState(`${DEFAULT_ROUTE_CORRIDOR_FEET}`);
  const [progressSamples, setProgressSamples] = useState<ProgressSample[]>([]);
  const matchRef = useRef(match);
  const offRouteSinceMsRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const initialMatch = createInitialRouteMatch(route);
    matchRef.current = initialMatch;
    offRouteSinceMsRef.current = undefined;
    setMatch(initialMatch);
    setProgressSamples([]);
    setFitRequestId((value) => value + 1);
  }, [route]);

  const handleLocationUpdate = useCallback(
    (location: Location.LocationObject) => {
      const fix: LocationFix = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracyMeters: location.coords.accuracy,
        speedMetersPerSecond: location.coords.speed,
        timestampMs: location.timestamp
      };

      setActualLocation(fix);
      const update = updateRouteMatch({
        route,
        fix,
        previousMatch: matchRef.current,
        offRouteSinceMs: offRouteSinceMsRef.current,
        settings: defaultRouteMatchSettings(corridorFeet)
      });

      offRouteSinceMsRef.current = update.offRouteSinceMs;
      matchRef.current = update.match;
      setMatch(update.match);

      if (update.acceptedReliableProgress) {
        setProgressSamples((currentSamples) =>
          trimProgressSamples([
            ...currentSamples,
            {
              timestampMs: fix.timestampMs,
              progressMeters: update.match.progressMeters
            }
          ])
        );
      }
    },
    [corridorFeet, route]
  );

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    async function startLocationWatch() {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (cancelled) {
        return;
      }

      if (!permission.granted) {
        setLocationError("Location permission is needed to show your live GPS position.");
        return;
      }

      setLocationError(null);

      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High
        });
        if (!cancelled) {
          handleLocationUpdate(currentLocation);
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5,
            timeInterval: 3000
          },
          handleLocationUpdate
        );

        if (cancelled) {
          subscription.remove();
        }
      } catch {
        if (!cancelled) {
          setLocationError("GPS is unavailable right now.");
        }
      }
    }

    startLocationWatch();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [handleLocationUpdate]);

  const plannedEta = useMemo(
    () => plannedSpeedEta(match.remainingMeters, averageSpeedMph),
    [averageSpeedMph, match.remainingMeters]
  );
  const observedSpeedMph = useMemo(
    () => computeObservedSpeedMph(progressSamples),
    [progressSamples]
  );

  const openSettings = useCallback(() => {
    setSpeedInput(`${averageSpeedMph}`);
    setCorridorInput(`${corridorFeet}`);
    setSettingsOpen(true);
  }, [averageSpeedMph, corridorFeet]);

  const saveSettings = useCallback(() => {
    const nextSpeedMph = Number(speedInput);
    const nextCorridorFeet = Number(corridorInput);

    if (Number.isFinite(nextSpeedMph) && nextSpeedMph > 0) {
      setAverageSpeedMph(nextSpeedMph);
    }

    if (Number.isFinite(nextCorridorFeet) && nextCorridorFeet > 0) {
      setCorridorFeet(nextCorridorFeet);
    }

    setSettingsOpen(false);
  }, [corridorInput, speedInput]);

  return (
    <View style={styles.screen}>
      <RouteMap
        actualLocation={actualLocation}
        fitRequestId={fitRequestId}
        followRequestId={followRequestId}
        match={match}
        route={route}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Back to route list"
            onPress={onBack}
            style={({ pressed }) => [
              styles.topButton,
              pressed && styles.pressedButton
            ]}
          >
            <ArrowLeft color="#082c35" size={21} strokeWidth={2.4} />
          </Pressable>

          <View style={styles.mapActions}>
            <Pressable
              accessibilityLabel="Follow actual GPS location"
              onPress={() => setFollowRequestId((value) => value + 1)}
              style={({ pressed }) => [
                styles.topButton,
                pressed && styles.pressedButton
              ]}
            >
              <Crosshair color="#082c35" size={20} strokeWidth={2.4} />
            </Pressable>
            <Pressable
              accessibilityLabel="Fit full route"
              onPress={() => setFitRequestId((value) => value + 1)}
              style={({ pressed }) => [
                styles.topButton,
                pressed && styles.pressedButton
              ]}
            >
              <Maximize2 color="#082c35" size={20} strokeWidth={2.4} />
            </Pressable>
          </View>
        </View>

        {locationError && (
          <View style={styles.locationError}>
            <Text style={styles.locationErrorText}>{locationError}</Text>
          </View>
        )}
      </SafeAreaView>

      <BottomNavPanel
        match={match}
        observedSpeedMph={observedSpeedMph}
        onOpenSettings={openSettings}
        plannedEta={plannedEta}
        route={route}
      />

      <SettingsModal
        averageSpeedMph={averageSpeedMph}
        corridorFeet={corridorFeet}
        corridorInput={corridorInput}
        match={match}
        onChangeCorridorInput={setCorridorInput}
        onChangeSpeedInput={setSpeedInput}
        onClose={() => setSettingsOpen(false)}
        onSave={saveSettings}
        route={route}
        speedInput={speedInput}
        visible={settingsOpen}
      />
    </View>
  );
}

function SettingsModal({
  visible,
  route,
  match,
  averageSpeedMph,
  corridorFeet,
  speedInput,
  corridorInput,
  onChangeSpeedInput,
  onChangeCorridorInput,
  onClose,
  onSave
}: {
  visible: boolean;
  route: RiverRoute;
  match: RouteMatch;
  averageSpeedMph: number;
  corridorFeet: number;
  speedInput: string;
  corridorInput: string;
  onChangeSpeedInput: (value: string) => void;
  onChangeCorridorInput: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.select({
          ios: "padding",
          default: undefined
        })}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalPanel}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settings / Debug</Text>
            <Pressable
              accessibilityLabel="Close settings"
              onPress={onClose}
              style={({ pressed }) => [
                styles.smallIconButton,
                pressed && styles.pressedButton
              ]}
            >
              <X color="#0b3038" size={20} strokeWidth={2.4} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.formRow}>
              <Text style={styles.inputLabel}>Average float speed</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  keyboardType="decimal-pad"
                  onChangeText={onChangeSpeedInput}
                  style={styles.input}
                  value={speedInput}
                />
                <Text style={styles.inputUnit}>mph</Text>
              </View>
              <Text style={styles.hintText}>Current: {averageSpeedMph.toFixed(1)} mph</Text>
            </View>

            <View style={styles.formRow}>
              <Text style={styles.inputLabel}>Route corridor tolerance</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  keyboardType="number-pad"
                  onChangeText={onChangeCorridorInput}
                  style={styles.input}
                  value={corridorInput}
                />
                <Text style={styles.inputUnit}>ft</Text>
              </View>
              <Text style={styles.hintText}>Current: {Math.round(corridorFeet)} ft</Text>
            </View>

            <View style={styles.debugPanel}>
              <DebugRow
                label="GPS accuracy"
                value={
                  typeof match.gpsAccuracyMeters === "number"
                    ? `${Math.round(metersToFeet(match.gpsAccuracyMeters))} ft`
                    : "Waiting"
                }
              />
              <DebugRow
                label="Distance from route"
                value={
                  typeof match.distanceFromRouteMeters === "number"
                    ? `${Math.round(metersToFeet(match.distanceFromRouteMeters))} ft`
                    : "Waiting"
                }
              />
              <DebugRow label="Snapped distance along route" value={formatDistance(match.progressMeters)} />
              <DebugRow label="Remaining route distance" value={formatDistance(match.remainingMeters)} />
              <DebugRow label="Route points loaded" value={`${route.points.length}`} />
            </View>
          </ScrollView>

          <Pressable
            accessibilityLabel="Save settings"
            onPress={onSave}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressedButton
            ]}
          >
            <Save color="#f7fbf7" size={18} strokeWidth={2.4} />
            <Text style={styles.saveButtonText}>Save</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DebugRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.debugRow}>
      <Text style={styles.debugLabel}>{label}</Text>
      <Text style={styles.debugValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#061013",
    flex: 1
  },
  overlay: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingTop: 8
  },
  mapActions: {
    flexDirection: "row",
    gap: 8
  },
  topButton: {
    alignItems: "center",
    backgroundColor: "rgba(247, 251, 247, 0.94)",
    borderRadius: 8,
    height: 44,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3
    },
    shadowOpacity: 0.18,
    shadowRadius: 9,
    width: 44,
    elevation: 10
  },
  pressedButton: {
    opacity: 0.72
  },
  locationError: {
    alignSelf: "center",
    backgroundColor: "#ffe1db",
    borderRadius: 8,
    marginTop: 14,
    maxWidth: "90%",
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  locationErrorText: {
    color: "#842114",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center"
  },
  modalBackdrop: {
    backgroundColor: "rgba(0, 0, 0, 0.38)",
    flex: 1,
    justifyContent: "flex-end"
  },
  modalPanel: {
    backgroundColor: "#f7fbf7",
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    maxHeight: "82%",
    padding: 18
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  modalTitle: {
    color: "#092d35",
    fontSize: 21,
    fontWeight: "900"
  },
  smallIconButton: {
    alignItems: "center",
    backgroundColor: "#ddebe9",
    borderRadius: 8,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  modalContent: {
    gap: 18,
    paddingBottom: 16,
    paddingTop: 18
  },
  formRow: {
    gap: 7
  },
  inputLabel: {
    color: "#143b43",
    fontSize: 13,
    fontWeight: "800"
  },
  inputWrap: {
    alignItems: "center",
    backgroundColor: "#e8f1ef",
    borderColor: "#c5d9d6",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingHorizontal: 12
  },
  input: {
    color: "#082c35",
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    paddingVertical: 10
  },
  inputUnit: {
    color: "#5f7479",
    fontSize: 13,
    fontWeight: "800"
  },
  hintText: {
    color: "#61777c",
    fontSize: 12
  },
  debugPanel: {
    backgroundColor: "#e8f1ef",
    borderRadius: 8,
    padding: 12
  },
  debugRow: {
    borderBottomColor: "#cbdcda",
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingVertical: 9
  },
  debugLabel: {
    color: "#5f7479",
    flex: 1,
    fontSize: 13
  },
  debugValue: {
    color: "#0c3038",
    fontSize: 13,
    fontWeight: "800",
    textAlign: "right"
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#116d7e",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50
  },
  saveButtonText: {
    color: "#f7fbf7",
    fontSize: 15,
    fontWeight: "900"
  }
});
