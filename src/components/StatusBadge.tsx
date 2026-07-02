import { StyleSheet, Text, View } from "react-native";

import type { RouteStatus } from "../types/route";

type StatusBadgeProps = {
  status: RouteStatus;
};

const STATUS_STYLES: Record<
  RouteStatus,
  { backgroundColor: string; color: string }
> = {
  "On route": {
    backgroundColor: "#d8f8e6",
    color: "#075c34"
  },
  "GPS uncertain": {
    backgroundColor: "#fff1c7",
    color: "#6d4800"
  },
  "Possibly off route": {
    backgroundColor: "#ffd9d3",
    color: "#842114"
  }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const statusStyle = STATUS_STYLES[status];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: statusStyle.backgroundColor
        }
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: statusStyle.color
          }
        ]}
      >
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  text: {
    fontSize: 12,
    fontWeight: "700"
  }
});
