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
  },
  dark: {
    text: "#ffffff",
    background: "#000000",
    backgroundElement: "#212225",
    backgroundSelected: "#2E3135",
    textSecondary: "#B0B4BA",
    backgroundBorder: "#363E4C",
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
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: 25,
      paddingHorizontal: 16,
    },

    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: theme === "dark" ? Colors.dark.text : Colors.light.text,
    },

    text: {
      fontSize: 16,
      color: theme === "dark" ? Colors.dark.text : Colors.light.text,
    },

    courseBox: {
      backgroundColor:
        theme === "dark"
          ? Colors.dark.backgroundElement
          : Colors.light.backgroundElement,
      borderRadius: 16,
      padding: 18,
      marginVertical: 8,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor:
        theme === "dark"
          ? Colors.dark.backgroundBorder
          : Colors.light.backgroundBorder,
    },
  });
};
