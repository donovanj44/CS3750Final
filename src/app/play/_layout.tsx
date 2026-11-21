import { Stack } from "expo-router";

import { RoundProvider } from "@/context/round-context";

export default function PlayLayout() {
  return (
    <RoundProvider>
      <Stack />
    </RoundProvider>
  );
}
