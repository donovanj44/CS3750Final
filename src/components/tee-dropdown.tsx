import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ColorSchemeName, Pressable, ScrollView, Text, View } from "react-native";

import { OpenGolfTee } from "@/constants/opengolf";
import { createStyles } from "@/constants/theme";

export function formatTee(tee: OpenGolfTee) {
  const par = tee.par != null ? `Par ${tee.par}` : null;
  const yardage =
    tee.yardage != null ? `${tee.yardage.toLocaleString()} yds` : "-- yds";
  return [tee.tee_name, tee.gender, par, yardage].filter(Boolean).join(" · ");
}

type TeeDropdownProps = {
  tees: OpenGolfTee[];
  selectedTee: OpenGolfTee | null;
  onSelect: (tee: OpenGolfTee) => void;
  theme: ColorSchemeName;
};

export default function TeeDropdown({
  tees,
  selectedTee,
  onSelect,
  theme,
}: Readonly<TeeDropdownProps>) {
  const styles = createStyles(theme);
  const [isOpen, setIsOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      return () => setIsOpen(false);
    }, []),
  );

  return (
    <View style={styles.dropdownAnchor}>
      {isOpen && (
        <View style={styles.dropdownMenu}>
          <ScrollView bounces={false} contentContainerStyle={styles.dropdownList}>
            {tees.map((tee) => {
              const selected = tee.tee_key === selectedTee?.tee_key;
              return (
                <Pressable
                  key={tee.tee_key}
                  onPress={() => {
                    onSelect(tee);
                    setIsOpen(false);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [
                    styles.dropdownOption,
                    selected && styles.dropdownOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.text}>{formatTee(tee)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Pressable
        onPress={() => setIsOpen((wasOpen) => !wasOpen)}
        accessibilityRole="button"
        accessibilityLabel="Select tees"
        accessibilityState={{ expanded: isOpen }}
        style={({ pressed }) => [
          styles.courseBox,
          styles.dropdownHeader,
          pressed && styles.pressed,
        ]}
      >
        <View style={styles.dropdownHeaderText}>
          <Text style={styles.secondaryText}>Tees</Text>
          <Text style={styles.text}>
            {selectedTee ? formatTee(selectedTee) : "Select tees"}
          </Text>
        </View>
        <Text style={styles.secondaryText}>{isOpen ? "▼" : "▲"}</Text>
      </Pressable>
    </View>
  );
}
