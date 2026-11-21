import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView, Text, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Scorecard from "@/components/scorecard";
import { formatToPar, useCompletedRounds } from "@/constants/round-storage";
import { BottomTabInset, createStyles } from "@/constants/theme";

export default function RoundScorecardScreen() {
  const theme = useColorScheme() ?? "dark";
  const styles = createStyles(theme);
  const safeAreaInsets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: rounds, loading, errorMsg } = useCompletedRounds();
  const round = rounds?.find((candidate) => candidate.id === id) ?? null;

  let statusMessage: string | null = null;
  if (loading) statusMessage = "Loading round...";
  else if (errorMsg) statusMessage = errorMsg;
  else if (!round) statusMessage = "Round not found.";

  const toPar = round ? formatToPar(round.totalStrokes, round.totalPar) : null;

  return (
    <>
      <Stack.Screen options={{ title: "Scorecard" }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: safeAreaInsets.bottom + BottomTabInset + 16,
        }}
      >
        {statusMessage || !round ? (
          <Text style={[styles.text, styles.centeredText]}>
            {statusMessage}
          </Text>
        ) : (
          <>
            <View style={[styles.courseBox, styles.stackedContent]}>
              <Text style={styles.title}>{round.courseName}</Text>
              <Text style={styles.secondaryText}>
                {new Date(round.completedAt).toLocaleDateString()}
              </Text>
              <Text style={styles.roundScore}>
                {round.totalStrokes}
                {toPar ? ` (${toPar})` : ""}
              </Text>
            </View>
            <Scorecard holes={round.holes} theme={theme} />
          </>
        )}
      </ScrollView>
    </>
  );
}
