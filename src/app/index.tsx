import { FlatList, Text, useColorScheme } from "react-native";

import CourseBox from "@/components/course-box";
import { useLocation, useNearbyCourses } from "@/constants/overpass";
import { createStyles } from "@/constants/theme";

function getStatusMessage(
  locationLoading: boolean,
  locationError: string | null,
  coursesLoading: boolean,
  coursesError: string | null,
  courseCount: number,
) {
  if (locationLoading) return "Getting your location...";
  if (locationError) return `Error: ${locationError}`;
  if (coursesLoading) return "Loading nearby courses...";
  if (coursesError) return `Error: ${coursesError}`;
  if (courseCount === 0) return "No courses found nearby.";
  return null;
}

export default function HomeScreen() {
  const theme = useColorScheme() ?? "dark";
  const styles = createStyles(theme);

  const {
    location,
    loading: locationLoading,
    errorMsg: locationError,
  } = useLocation();
  const {
    data: courses,
    loading: coursesLoading,
    errorMsg: coursesError,
    refreshCourses,
  } = useNearbyCourses(location);

  const statusMessage = getStatusMessage(
    locationLoading,
    locationError,
    coursesLoading,
    coursesError,
    courses?.length ?? 0,
  );

  return (
    <FlatList
      style={styles.container}
      data={courses ?? []}
      keyExtractor={(course) => course.id}
      renderItem={({ item }) => <CourseBox course={item} theme={theme} />}
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
