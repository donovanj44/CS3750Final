import { ColorSchemeName, Text, View } from "react-native";

import { createStyles } from "@/constants/theme";

type HoleHeaderProps = {
  holeNumber: number;
  holeCount: number;
  par: number | null;
  yards: number | null;
  frontBack: { front: number; back: number } | null;
  yardageLabel: string;
  top: number;
  theme: ColorSchemeName;
};

export default function HoleHeader({
  holeNumber,
  holeCount,
  par,
  yards,
  frontBack,
  yardageLabel,
  top,
  theme,
}: Readonly<HoleHeaderProps>) {
  const styles = createStyles(theme);

  return (
    <View style={[styles.hudStack, styles.hudRow, { top }]}>
      <View style={styles.mapTile}>
        <Text style={styles.secondaryText}>
          Hole {holeNumber} of {holeCount}
        </Text>
        <Text style={styles.roundScore}>Par {par ?? "–"}</Text>
      </View>
      <View style={styles.mapTile}>
        <Text style={styles.roundScore}>
          {yards == null ? "--" : Math.round(yards)}
        </Text>
        {frontBack && (
          <Text style={styles.secondaryText}>
            F {Math.round(frontBack.front)} · B {Math.round(frontBack.back)}
          </Text>
        )}
        <Text style={styles.secondaryText}>{yardageLabel} (yds)</Text>
      </View>
    </View>
  );
}
