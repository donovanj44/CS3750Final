import { useState } from "react";
import {
  ColorSchemeName,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { Colors, createStyles } from "@/constants/theme";

const MAX_NAME_LENGTH = 30;

type PlayerNameModalProps = {
  visible: boolean;
  theme: ColorSchemeName;
  onSave: (name: string) => void;
  onSkip: () => void;
};

export default function PlayerNameModal({
  visible,
  theme,
  onSave,
  onSkip,
}: Readonly<PlayerNameModalProps>) {
  const [name, setName] = useState("");
  const themeStyles = createStyles(theme);
  const colors = theme === "dark" ? Colors.dark : Colors.light;
  const trimmed = name.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSkip}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.background,
              borderColor: colors.backgroundBorder,
            },
          ]}
        >
          <Text style={themeStyles.title}>Your name</Text>
          <Text style={themeStyles.secondaryText}>
            Shown with the rounds you upload.
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.backgroundElement,
                borderColor: colors.backgroundBorder,
              },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={colors.textSecondary}
            maxLength={MAX_NAME_LENGTH}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={() => trimmed && onSave(trimmed)}
          />
          <Pressable
            accessibilityRole="button"
            disabled={!trimmed}
            style={({ pressed }) => [
              themeStyles.button,
              themeStyles.playButton,
              styles.action,
              pressed && themeStyles.pressed,
              !trimmed && themeStyles.disabled,
            ]}
            onPress={() => onSave(trimmed)}
          >
            <Text style={themeStyles.playButtonText}>Save</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              themeStyles.button,
              styles.action,
              pressed && themeStyles.pressed,
            ]}
            onPress={onSkip}
          >
            <Text style={themeStyles.buttonText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    marginTop: 8,
  },
  action: {
    marginHorizontal: 0,
    marginVertical: 4,
  },
});
