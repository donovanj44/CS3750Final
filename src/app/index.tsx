import * as Device from "expo-device";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";


import CourseBox from "@/components/course-box";
import { ThemedText } from "@/components/themed-text";
import { useLocation, useNearbyCourses } from "@/constants/overpass";
import {
  BottomTabInset,
  createStyles,
  MaxContentWidth,
  Spacing,
} from "@/constants/theme";

function getDevMenuHint() {
  if (Platform.OS === "web") {
    return <ThemedText type="small">use browser devtools</ThemedText>;
  }
  if (Device.isDevice) {
    return (
      <ThemedText type="small">
        shake device or press <ThemedText type="code">m</ThemedText> in terminal
      </ThemedText>
    );
  }
  const shortcut = Platform.OS === "android" ? "cmd+m (or ctrl+m)" : "cmd+d";
  return (
    <ThemedText type="small">
      press <ThemedText type="code">{shortcut}</ThemedText>
    </ThemedText>
  );
}

export default function HomeScreen() {
  let theme = useColorScheme() ?? "dark";

  const styles = createStyles(theme);
  const { location, errorMsg, loading, refreshLocation } = useLocation();
  const {
    data: courses,
    loading: coursesLoading,
    errorMsg: coursesError,
    refreshCourses,
  } = useNearbyCourses(location);

  return (
    <ScrollView>
      <CourseBox name="CourseName" desc="Course Description" theme={theme} />
      {coursesError && <Text style={styles.text}>Error: {coursesError}</Text>}
      {location && (
        <View>
          <Text style={styles.text}>
            Your Location: Lat: {location.coords.latitude}, Long:{" "}
            {location.coords.longitude}
          </Text>
        </View>
      )}
      <Text>Text</Text>
      {courses && (
        <View>
          <Text style={styles.text}>
            Text: {JSON.stringify(courses, null, 2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    flexDirection: "row",
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: "center",
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  heroSection: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: "center",
  },
  code: {
    textTransform: "uppercase",
  },
  stepContainer: {
    gap: Spacing.three,
    alignSelf: "stretch",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
