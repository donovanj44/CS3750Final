import { ColorSchemeName, Text, View } from "react-native";

import { formatToPar, RoundHole } from "@/constants/round-storage";
import { createStyles } from "@/constants/theme";

type ScoreRowProps = {
  label: string;
  par: string;
  strokes: string;
  toPar: string;
  theme: ColorSchemeName;
  variant?: "header" | "subtotal";
  isUnderPar?: boolean;
};

function ScoreRow({
  label,
  par,
  strokes,
  toPar,
  theme,
  variant,
  isUnderPar = false,
}: Readonly<ScoreRowProps>) {
  const styles = createStyles(theme);
  const isBold = variant !== undefined;
  const cellStyle = [styles.scoreCell, isBold && styles.scoreCellBold];

  return (
    <View
      style={[
        styles.scoreRow,
        variant === "header" && styles.scoreHeaderRow,
        variant === "subtotal" && styles.scoreSubtotalRow,
      ]}
    >
      <Text style={cellStyle}>{label}</Text>
      <Text style={cellStyle}>{par}</Text>
      <Text style={[cellStyle, isUnderPar && styles.scoreUnderPar]}>
        {strokes}
      </Text>
      <Text style={[cellStyle, isUnderPar && styles.scoreUnderPar]}>
        {toPar}
      </Text>
    </View>
  );
}

function totals(holes: RoundHole[]) {
  const strokes = holes.reduce((sum, hole) => sum + hole.strokes, 0);
  const par = holes.reduce((sum, hole) => sum + (hole.par ?? 0), 0);
  return { strokes, par };
}

type SubtotalRowProps = {
  label: string;
  holes: RoundHole[];
  theme: ColorSchemeName;
};

function SubtotalRow({ label, holes, theme }: Readonly<SubtotalRowProps>) {
  const { strokes, par } = totals(holes);
  return (
    <ScoreRow
      label={label}
      par={par === 0 ? "-" : String(par)}
      strokes={String(strokes)}
      toPar={formatToPar(strokes, par) ?? "-"}
      theme={theme}
      variant="subtotal"
    />
  );
}

type ScorecardProps = {
  holes: RoundHole[];
  theme: ColorSchemeName;
};

export default function Scorecard({ holes, theme }: Readonly<ScorecardProps>) {
  const styles = createStyles(theme);
  const front = holes.filter((hole) => hole.number <= 9);
  const back = holes.filter((hole) => hole.number > 9);
  const showSplits = front.length > 0 && back.length > 0;

  const renderHole = (hole: RoundHole) => (
    <ScoreRow
      key={hole.number}
      label={String(hole.number)}
      par={hole.par == null ? "-" : String(hole.par)}
      strokes={String(hole.strokes)}
      toPar={hole.par == null ? "-" : (formatToPar(hole.strokes, hole.par) ?? "-")}
      theme={theme}
      isUnderPar={hole.par != null && hole.strokes < hole.par}
    />
  );

  return (
    <View style={styles.scorecard}>
      <ScoreRow
        label="Hole"
        par="Par"
        strokes="Score"
        toPar="+/-"
        theme={theme}
        variant="header"
      />
      {front.map(renderHole)}
      {showSplits && <SubtotalRow label="Out" holes={front} theme={theme} />}
      {back.map(renderHole)}
      {showSplits && <SubtotalRow label="In" holes={back} theme={theme} />}
      <SubtotalRow label="Total" holes={holes} theme={theme} />
    </View>
  );
}
