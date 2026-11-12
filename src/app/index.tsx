import { useRouter } from "expo-router";
import { FlatList, Text, useColorScheme } from "react-native";

import CourseBox from "@/components/course-box";
import { createStyles } from "@/constants/theme";
import { getCoursesStatusMessage, useCourses } from "@/context/courses-context";

export default function HomeScreen() {
  const theme = useColorScheme() ?? "dark";
  const styles = createStyles(theme);
  const router = useRouter();

  const coursesState = useCourses();
  const { location, courses, coursesLoading, refreshCourses, selectCourse } =
    coursesState;
  const statusMessage = getCoursesStatusMessage(coursesState);

  return (
    <FlatList
      style={styles.container}
      data={courses ?? []}
      keyExtractor={(course) => course.id}
      renderItem={({ item }) => (
        <CourseBox
          course={item}
          theme={theme}
          onPress={() => {
            selectCourse(item.id);
            router.navigate("/play");
          }}
        />
      )}
      ListHeaderComponent={
        statusMessage ? (
          <Text style={styles.text}>{statusMessage}</Text>
        ) : undefined
      }
      refreshing={coursesLoading && location !== null}
      onRefresh={refreshCourses}
    />
  );
}
