import { ColorSchemeName, Text, View } from "react-native";

import { RoundHole } from "@/constants/round-storage";
import { createStyles } from "@/constants/theme";

type NineGridProps = {
  label: string;
  holes: RoundHole[];
  theme: ColorSchemeName;
};

function NineGrid({ label, holes, theme }: Readonly<NineGridProps>) {
  const styles = createStyles(theme);
  const hasPar = holes.some((hole) => hole.par != null);
  const totalStrokes = holes.reduce((sum, hole) => sum + hole.strokes, 0);
  const totalPar = holes.reduce((sum, hole) => sum + (hole.par ?? 0), 0);
  const labelCell = [styles.holeGridCell, styles.holeGridLabelCell];
  const subtotalCell = [styles.holeGridCell, styles.holeGridSubtotalCell];

  return (
    <View style={styles.holeGrid}>
      <View style={[styles.holeGridRow, styles.holeGridHeaderRow]}>
        <Text style={labelCell}>Hole</Text>
        {holes.map((hole) => (
          <Text key={hole.number} style={styles.holeGridCell}>
            {hole.number}
          </Text>
        ))}
        <Text style={subtotalCell}>{label}</Text>
      </View>
      {hasPar && (
        <View style={styles.holeGridRow}>
          <Text style={labelCell}>Par</Text>
          {holes.map((hole) => (
            <Text key={hole.number} style={styles.holeGridCell}>
              {hole.par ?? "-"}
            </Text>
          ))}
          <Text style={subtotalCell}>{totalPar}</Text>
        </View>
      )}
      <View style={styles.holeGridRow}>
        <Text style={labelCell}>Score</Text>
        {holes.map((hole) => (
          <Text
            key={hole.number}
            style={[
              styles.holeGridCell,
              hole.par != null && hole.strokes < hole.par && styles.scoreUnderPar,
            ]}
          >
            {hole.strokes}
          </Text>
        ))}
        <Text style={subtotalCell}>{totalStrokes}</Text>
      </View>
    </View>
  );
}

type HoleScoresProps = {
  holes: RoundHole[];
  theme: ColorSchemeName;
};

export default function HoleScores({ holes, theme }: Readonly<HoleScoresProps>) {
  const front = holes.filter((hole) => hole.number <= 9);
  const back = holes.filter((hole) => hole.number > 9);
  const showSplits = front.length > 0 && back.length > 0;

  return (
    <>
      {front.length > 0 && (
        <NineGrid label={showSplits ? "Out" : "Tot"} holes={front} theme={theme} />
      )}
      {back.length > 0 && (
        <NineGrid label={showSplits ? "In" : "Tot"} holes={back} theme={theme} />
      )}
    </>
  );
}
