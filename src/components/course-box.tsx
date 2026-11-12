import { Course } from "@/constants/overpass";
import { createStyles } from "@/constants/theme";
import { ColorSchemeName, Pressable, Text } from "react-native";

export type CourseBoxProps = {
  course: Course;
  theme: ColorSchemeName;
  onPress?: () => void;
};

export default function CourseBox({
  course,
  theme,
  onPress,
}: Readonly<CourseBoxProps>) {
  const styles = createStyles(theme);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.courseBox, pressed && styles.pressed]}
    >
      <Text style={styles.title}>{course.name}</Text>
      <Text style={styles.text}>{course.phone}</Text>
      <Text style={styles.text}>{course.website}</Text>
    </Pressable>
  );
}
