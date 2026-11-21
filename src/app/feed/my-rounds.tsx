import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback } from "react";
import { FlatList, Text, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import RoundBox from "@/components/round-box";
import { useCompletedRounds } from "@/constants/round-storage";
import { BottomTabInset, createStyles } from "@/constants/theme";

export default function MyRoundsScreen() {
  const theme = useColorScheme() ?? "dark";
  const styles = createStyles(theme);
  const safeAreaInsets = useSafeAreaInsets();
  const router = useRouter();
  const { data: rounds, loading, errorMsg, refreshRounds } = useCompletedRounds();

  useFocusEffect(
    useCallback(() => {
      refreshRounds();
    }, [refreshRounds]),
  );

  return (
    <>
      <Stack.Screen options={{ title: "My Rounds" }} />
      <FlatList
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: safeAreaInsets.bottom + BottomTabInset + 16,
        }}
        data={rounds ?? []}
        keyExtractor={(round) => round.id}
        renderItem={({ item }) => (
          <RoundBox
            round={item}
            theme={theme}
            onPress={() =>
              router.push({
                pathname: "/feed/round/[id]",
                params: { id: item.id },
              })
            }
          />
        )}
        ListEmptyComponent={
          loading ? undefined : (
            <Text style={[styles.text, styles.centeredText]}>
              {errorMsg ??
                "No rounds yet. Finish a round in Play to see it here."}
            </Text>
          )
        }
        refreshing={loading}
        onRefresh={refreshRounds}
      />
    </>
  );
}
