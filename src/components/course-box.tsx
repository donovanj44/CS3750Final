import { createStyles } from "@/constants/theme";
import { ColorSchemeName, Text, View } from "react-native";

export type CourseProps = {
  name: string;
  desc: string;
  theme: ColorSchemeName;
};

export default function CourseBox({ name, desc, theme }: CourseProps) {
  const styles = createStyles(theme);

  return (
    <View style={styles.courseBox}>
      <Text style={styles.title}>{name}</Text>
      <Text style={styles.text}>{desc}</Text>
    </View>
  );
}
