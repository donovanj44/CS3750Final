import { Stack } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import MapView from "react-native-maps";

import {
  regionAroundPoint,
  regionForCoordinates,
  useHoleCoordinates,
} from "@/constants/hole-location";
import { createStyles } from "@/constants/theme";
import { useCourses, useCurrentCourse } from "@/context/courses-context";
import { useSetIsTabBarHidden } from "@/context/tab-bar-context";

const FIRST_HOLE = 1;

export default function CourseMap() {
  const theme = useColorScheme() ?? "dark";
  const themeStyles = createStyles(theme);
  const setIsTabBarHidden = useSetIsTabBarHidden();
  const { location } = useCourses();
  const { course } = useCurrentCourse();
  const { data: holeCoordinates, loading: holeLoading } = useHoleCoordinates(
    course,
    FIRST_HOLE,
  );

  useEffect(() => {
    setIsTabBarHidden(true);
    return () => setIsTabBarHidden(false);
  }, [setIsTabBarHidden]);

  let initialRegion;
  if (holeCoordinates?.length) {
    initialRegion = regionForCoordinates(holeCoordinates);
  } else if (location) {
    initialRegion = regionAroundPoint(
      location.coords.latitude,
      location.coords.longitude,
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: course?.name ?? "Course Map" }} />
      {holeLoading ? (
        <View style={styles.loading}>
          <Text style={[themeStyles.text, themeStyles.centeredText]}>
            Finding hole {FIRST_HOLE}...
          </Text>
        </View>
      ) : (
        <MapView
          style={styles.map}
          mapType="satellite"
          showsUserLocation
          initialRegion={initialRegion}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  map: {
    width: "100%",
    height: "100%",
  },
});
