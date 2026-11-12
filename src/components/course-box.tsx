import { Course } from "@/constants/overpass";
import { createStyles } from "@/constants/theme";
import { ColorSchemeName, Text, View } from "react-native";

export type CourseProps = {
  course: Course;
  theme: ColorSchemeName;
};

export default function CourseBox({ course, theme }: CourseProps) {
  const styles = createStyles(theme);

  return (
    <View style={styles.courseBox}>
      <Text style={styles.title}>{course.name}</Text>
      <Text style={styles.text}>{course.phone}</Text>
      <Text style={styles.text}>{course.website}</Text>
    </View>
  );
}
