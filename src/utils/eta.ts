import { METERS_PER_MILE } from "./geoMath";

export const DEFAULT_AVERAGE_FLOAT_SPEED_MPH = 2.5;
const MPH_TO_METERS_PER_SECOND = METERS_PER_MILE / 3600;
const METERS_PER_SECOND_TO_MPH = 3600 / METERS_PER_MILE;
const OBSERVED_SPEED_WINDOW_MS = 5 * 60 * 1000;

export type PlannedEta = {
  eta: Date | null;
  timeRemainingMs: number | null;
};

export type ProgressSample = {
  timestampMs: number;
  progressMeters: number;
};

export function plannedSpeedEta(
  remainingMeters: number,
  speedMph: number,
  now = new Date()
): PlannedEta {
  const metersPerSecond = speedMph * MPH_TO_METERS_PER_SECOND;
  if (!Number.isFinite(metersPerSecond) || metersPerSecond <= 0) {
    return {
      eta: null,
      timeRemainingMs: null
    };
  }

  const timeRemainingMs = (remainingMeters / metersPerSecond) * 1000;
  return {
    eta: new Date(now.getTime() + timeRemainingMs),
    timeRemainingMs
  };
}

export function computeObservedSpeedMph(
  samples: ProgressSample[],
  nowMs = Date.now()
): number | null {
  const recentSamples = samples.filter(
    (sample) => nowMs - sample.timestampMs <= OBSERVED_SPEED_WINDOW_MS
  );

  if (recentSamples.length < 2) {
    return null;
  }

  const first = recentSamples[0];
  const last = recentSamples[recentSamples.length - 1];
  const deltaMeters = last.progressMeters - first.progressMeters;
  const deltaSeconds = (last.timestampMs - first.timestampMs) / 1000;

  if (deltaSeconds < 30 || deltaMeters < 15) {
    return null;
  }

  const speedMph = (deltaMeters / deltaSeconds) * METERS_PER_SECOND_TO_MPH;
  if (speedMph < 0.1 || speedMph > 15) {
    return null;
  }

  return speedMph;
}

export function trimProgressSamples(
  samples: ProgressSample[],
  nowMs = Date.now()
): ProgressSample[] {
  return samples.filter(
    (sample) => nowMs - sample.timestampMs <= OBSERVED_SPEED_WINDOW_MS
  );
}

export function formatDistance(meters: number): string {
  const miles = meters / METERS_PER_MILE;
  if (miles < 0.1) {
    return `${Math.round(meters * 3.280839895)} ft`;
  }

  return `${miles.toFixed(miles >= 10 ? 0 : 1)} mi`;
}

export function formatDuration(timeMs: number | null): string {
  if (timeMs === null || !Number.isFinite(timeMs)) {
    return "Not available";
  }

  const totalMinutes = Math.max(0, Math.ceil(timeMs / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}

export function formatEta(eta: Date | null): string {
  if (eta === null) {
    return "Not available";
  }

  return eta.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });
}

export function formatSpeed(speedMph: number | null): string {
  if (speedMph === null || !Number.isFinite(speedMph)) {
    return "Calculating";
  }

  return `${speedMph.toFixed(1)} mph`;
}
