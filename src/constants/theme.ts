/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { ColorSchemeName, Platform, StyleSheet } from "react-native";

export const Colors = {
  light: {
    text: "#000000",
    background: "#ffffff",
    backgroundElement: "#F0F0F3",
    backgroundSelected: "#E0E1E6",
    textSecondary: "#60646C",
    backgroundBorder: "#E3EAF4",
    accent: "#1E7F46",
    accentBorder: "#17683A",
    onAccent: "#FFFFFF",
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    backgroundElement: "#212225",
    backgroundSelected: "#2E3135",
    textSecondary: "#B0B4BA",
    backgroundBorder: "#363E4C",
    accent: "#1F8A4C",
    accentBorder: "#2BA35E",
    onAccent: "#FFFFFF",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;

export const createStyles = (theme: ColorSchemeName) => {
  const colors = theme === "dark" ? Colors.dark : Colors.light;

  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 25,
      paddingHorizontal: 16,
    },

    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.text,
    },

    text: {
      fontSize: 16,
      color: colors.text,
    },

    secondaryText: {
      fontSize: 14,
      color: colors.textSecondary,
    },

    courseBox: {
      backgroundColor: colors.backgroundElement,
      borderRadius: 16,
      padding: 18,
      marginVertical: 8,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
    },

    feedBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: colors.backgroundElement,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 18,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
    },

    roundScore: {
      fontSize: 22,
      fontWeight: "700",
      color: colors.text,
    },

    scorecard: {
      backgroundColor: colors.backgroundElement,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
      marginVertical: 8,
      marginHorizontal: 16,
      overflow: "hidden",
    },

    scoreRow: {
      flexDirection: "row",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderTopWidth: 1,
      borderTopColor: colors.backgroundBorder,
    },

    scoreHeaderRow: {
      borderTopWidth: 0,
      backgroundColor: colors.backgroundSelected,
    },

    scoreSubtotalRow: {
      backgroundColor: colors.backgroundSelected,
    },

    scoreCell: {
      flex: 1,
      textAlign: "center",
      fontSize: 16,
      color: colors.text,
    },

    scoreCellBold: {
      fontWeight: "700",
    },

    scoreUnderPar: {
      color: colors.accentBorder,
      fontWeight: "700",
    },

    holeGrid: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
      marginTop: 8,
      overflow: "hidden",
    },

    holeGridRow: {
      flexDirection: "row",
      borderTopWidth: 1,
      borderTopColor: colors.backgroundBorder,
    },

    holeGridHeaderRow: {
      borderTopWidth: 0,
      backgroundColor: colors.backgroundSelected,
    },

    holeGridCell: {
      flex: 1,
      textAlign: "center",
      paddingVertical: 6,
      fontSize: 13,
      color: colors.text,
    },

    holeGridLabelCell: {
      flex: 1.8,
      textAlign: "left",
      paddingLeft: 8,
      fontWeight: "600",
    },

    holeGridSubtotalCell: {
      flex: 1.4,
      fontWeight: "700",
      backgroundColor: colors.backgroundSelected,
    },

    button: {
      backgroundColor: colors.backgroundSelected,
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 18,
      marginVertical: 8,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
      alignItems: "center",
    },

    buttonText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
    },

    playButton: {
      backgroundColor: colors.accent,
      borderColor: colors.accentBorder,
    },

    playButtonText: {
      fontSize: 18,
      fontWeight: "700",
      color: colors.onAccent,
    },

    pressed: {
      opacity: 0.7,
    },

    playContent: {
      flex: 1,
      justifyContent: "flex-end",
    },

    playContentCentered: {
      justifyContent: "center",
    },

    centeredText: {
      textAlign: "center",
    },

    stackedContent: {
      gap: 4,
    },

    imagePlaceholder: {
      width: "85%",
      maxWidth: 480,
      alignSelf: "center",
      aspectRatio: 16 / 9,
      backgroundColor: colors.backgroundElement,
      borderRadius: 16,
      marginTop: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
      alignItems: "center",
      justifyContent: "center",
    },

    dropdownHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    dropdownHeaderText: {
      flex: 1,
      gap: 4,
    },

    dropdownAnchor: {
      position: "relative",
      zIndex: 10,
    },

    dropdownMenu: {
      position: "absolute",
      bottom: "100%",
      left: 16,
      right: 16,
      maxHeight: 320,
      backgroundColor: colors.backgroundElement,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
      overflow: "hidden",
      zIndex: 10,
      elevation: 8,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },

    dropdownList: {
      padding: 8,
      gap: 4,
    },

    dropdownOption: {
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },

    dropdownOptionSelected: {
      backgroundColor: colors.backgroundSelected,
    },

    hudRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },

    distanceTag: {
      backgroundColor: colors.backgroundElement,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
      borderRadius: 8,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },

    distanceTagText: {
      fontSize: 12,
      fontWeight: "700",
      color: colors.text,
    },

    distanceTagSlot: {
      width: 120,
      paddingLeft: 72,
      flexDirection: "row",
      alignItems: "center",
    },

    hudPill: {
      position: "absolute",
      alignSelf: "center",
      backgroundColor: colors.backgroundElement,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
      paddingVertical: 8,
      paddingHorizontal: 16,
    },

    hudStack: {
      position: "absolute",
      left: 12,
      right: 12,
      gap: 8,
    },

    mapButton: {
      marginVertical: 0,
      marginHorizontal: 0,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 12,
      justifyContent: "center",
    },

    mapButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.text,
    },

    mapPlayButtonText: {
      fontSize: 15,
      fontWeight: "700",
      color: colors.onAccent,
    },

    mapStepperText: {
      fontSize: 20,
      fontWeight: "700",
      color: colors.text,
    },

    mapTile: {
      backgroundColor: colors.backgroundElement,
      borderWidth: 1,
      borderColor: colors.backgroundBorder,
      borderRadius: 12,
      paddingVertical: 6,
      paddingHorizontal: 12,
      alignItems: "center",
      gap: 2,
    },

    stepperValue: {
      minWidth: 48,
      textAlign: "center",
      fontSize: 32,
      fontWeight: "800",
      color: colors.text,
    },

    disabled: {
      opacity: 0.4,
    },
  });
};
