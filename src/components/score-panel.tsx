import { ColorSchemeName, Pressable, Text, View } from "react-native";

import { createStyles } from "@/constants/theme";

const DEFAULT_PAR = 4;

type ScorePanelProps = {
  holeNumber: number;
  holeCount: number;
  par: number | null;
  strokes: number | null;
  totalStrokes: number;
  toPar: number;
  canFinish: boolean;
  bottom: number;
  theme: ColorSchemeName;
  onChangeStrokes: (strokes: number) => void;
  onChangeHole: (delta: number) => void;
  onFinish: () => void;
};

export function formatToPar(toPar: number) {
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : String(toPar);
}

export default function ScorePanel({
  holeNumber,
  holeCount,
  par,
  strokes,
  totalStrokes,
  toPar,
  canFinish,
  bottom,
  theme,
  onChangeStrokes,
  onChangeHole,
  onFinish,
}: Readonly<ScorePanelProps>) {
  const styles = createStyles(theme);
  const isFirstHole = holeNumber <= 1;
  const isLastHole = holeNumber >= holeCount;
  const startingStrokes = par ?? DEFAULT_PAR;

  return (
    <View style={[styles.hudStack, { bottom }]}>
      <View style={styles.hudRow}>
        <View style={styles.mapTile}>
          <Text style={styles.secondaryText}>Total</Text>
          <Text style={styles.roundScore}>{totalStrokes}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remove a stroke"
          style={({ pressed }) => [
            styles.button,
            styles.mapButton,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            onChangeStrokes(strokes == null ? startingStrokes : strokes - 1)
          }
        >
          <Text style={styles.mapStepperText}>−</Text>
        </Pressable>

        <View style={styles.mapTile}>
          <Text style={styles.stepperValue}>{strokes ?? "–"}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a stroke"
          style={({ pressed }) => [
            styles.button,
            styles.mapButton,
            pressed && styles.pressed,
          ]}
          onPress={() =>
            onChangeStrokes(strokes == null ? startingStrokes : strokes + 1)
          }
        >
          <Text style={styles.mapStepperText}>+</Text>
        </Pressable>

        <View style={styles.mapTile}>
          <Text style={styles.secondaryText}>To par</Text>
          <Text style={styles.roundScore}>{formatToPar(toPar)}</Text>
        </View>
      </View>

      <View style={styles.hudRow}>
        <Pressable
          accessibilityRole="button"
          disabled={isFirstHole}
          style={({ pressed }) => [
            styles.button,
            styles.mapButton,
            pressed && styles.pressed,
            isFirstHole && styles.disabled,
          ]}
          onPress={() => onChangeHole(-1)}
        >
          <Text style={styles.mapButtonText}>‹ Prev</Text>
        </Pressable>

        {isLastHole ? (
          <Pressable
            accessibilityRole="button"
            disabled={!canFinish}
            style={({ pressed }) => [
              styles.button,
              styles.mapButton,
              styles.playButton,
              pressed && styles.pressed,
              !canFinish && styles.disabled,
            ]}
            onPress={onFinish}
          >
            <Text style={styles.mapPlayButtonText}>Finish round</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.button,
              styles.mapButton,
              pressed && styles.pressed,
            ]}
            onPress={() => onChangeHole(1)}
          >
            <Text style={styles.mapButtonText}>Next ›</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}
