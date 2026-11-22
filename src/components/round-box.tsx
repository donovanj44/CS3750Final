import { ColorSchemeName, Pressable, Text } from "react-native";

import HoleScores from "@/components/hole-scores";
import { CompletedRound, formatToPar } from "@/constants/round-storage";
import { createStyles } from "@/constants/theme";

export type RoundBoxProps = {
  round: CompletedRound;
  theme: ColorSchemeName;
  onPress?: () => void;
  playerName?: string;
  showHoles?: boolean;
};

export default function RoundBox({
  round,
  theme,
  onPress,
  playerName,
  showHoles = false,
}: Readonly<RoundBoxProps>) {
  const styles = createStyles(theme);
  const toPar = formatToPar(round.totalStrokes, round.totalPar);
  const holeCount = round.holes.length;
  const date = new Date(round.completedAt).toLocaleDateString();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.courseBox,
        styles.stackedContent,
        pressed && styles.pressed,
      ]}
    >
      {playerName ? (
        <Text style={styles.secondaryText}>{playerName}</Text>
      ) : null}
      <Text style={styles.title}>{round.courseName}</Text>
      <Text style={styles.secondaryText}>
        {date} · {holeCount} {holeCount === 1 ? "hole" : "holes"}
      </Text>
      <Text style={styles.roundScore}>
        {round.totalStrokes}
        {toPar ? ` (${toPar})` : ""}
      </Text>
      {showHoles && <HoleScores holes={round.holes} theme={theme} />}
    </Pressable>
  );
}
