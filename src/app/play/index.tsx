import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ColorSchemeName,
  Pressable,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import TeeDropdown from "@/components/tee-dropdown";
import { useCourseDetails } from "@/constants/opengolf";
import { Course } from "@/constants/overpass";
import { BottomTabInset, createStyles } from "@/constants/theme";
import {
  getCoursesStatusMessage,
  useCourses,
  useCurrentCourse,
} from "@/context/courses-context";
import { useRound, useRoundDispatch } from "@/context/round-context";

export default function PlayScreen() {
  const theme = useColorScheme() ?? "dark";
  const styles = createStyles(theme);
  const safeAreaInsets = useSafeAreaInsets();

  const coursesState = useCourses();
  const statusMessage = getCoursesStatusMessage(coursesState);
  const { pickedCourse, course } = useCurrentCourse();

  return (
    <View
      style={[
        styles.container,
        styles.playContent,
        {
          paddingTop: safeAreaInsets.top + 25,
          paddingBottom: safeAreaInsets.bottom + BottomTabInset + 16,
        },
        (statusMessage || !course) && styles.playContentCentered,
      ]}
    >
      <Stack.Screen options={{ title: "Play", headerShown: false }} />
      {statusMessage || !course ? (
        <Text style={[styles.text, styles.centeredText]}>{statusMessage}</Text>
      ) : (
        <SelectedCourseView
          key={course.id}
          course={course}
          isPicked={pickedCourse !== null}
          theme={theme}
        />
      )}
    </View>
  );
}

type SelectedCourseViewProps = {
  course: Course;
  isPicked: boolean;
  theme: ColorSchemeName;
};

function SelectedCourseView({
  course,
  isPicked,
  theme,
}: Readonly<SelectedCourseViewProps>) {
  const styles = createStyles(theme);
  const router = useRouter();
  const { courses, selectCourse } = useCourses();
  const round = useRound();
  const dispatchRound = useRoundDispatch();

  const {
    data: details,
    loading: detailsLoading,
    errorMsg: detailsError,
  } = useCourseDetails(course);

  const [selectedTeeKey, setSelectedTeeKey] = useState<string | null>(null);
  const tees = details?.tees ?? [];
  const selectedTee =
    tees.find((tee) => tee.tee_key === selectedTeeKey) ??
    details?.defaultTee ??
    null;

  const isResuming = round?.courseId === course.id;
  const otherRoundCourse =
    round && !isResuming
      ? (courses?.find((candidate) => candidate.id === round.courseId) ?? null)
      : null;

  function startRound() {
    dispatchRound({
      type: "started",
      courseId: course.id,
      courseName: course.name,
      teeKey: selectedTee?.tee_key ?? null,
    });
    router.push("/play/course-map");
  }

  function handlePlay() {
    if (!round || isResuming) {
      startRound();
      return;
    }
    Alert.alert(
      "Discard round?",
      `You have an unfinished round at ${round.courseName}. Starting here will discard it.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            dispatchRound({ type: "finished" });
            startRound();
          },
        },
      ],
    );
  }

  let teeStatus: string | null = null;
  if (detailsLoading) teeStatus = "Loading tees...";
  else if (detailsError) teeStatus = "Tee data unavailable";
  else if (tees.length === 0) teeStatus = "No tee data for this course";

  return (
    <>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.secondaryText}>Course image</Text>
      </View>

      <View style={styles.courseBox}>
        <Text style={styles.secondaryText}>
          {isPicked ? "Selected course" : "Closest course"}
        </Text>
        <Text style={styles.title}>{course.name}</Text>
        <Text style={styles.text}>{course.phone}</Text>
        <Text style={styles.text}>{course.website}</Text>
      </View>

      {details && !teeStatus ? (
        <TeeDropdown
          tees={tees}
          selectedTee={selectedTee}
          onSelect={(tee) => setSelectedTeeKey(tee.tee_key)}
          theme={theme}
        />
      ) : (
        <View style={[styles.courseBox, styles.stackedContent]}>
          <Text style={styles.secondaryText}>Tees</Text>
          <Text style={styles.text}>{teeStatus}</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        onPress={() => router.navigate("/")}
      >
        <Text style={styles.buttonText}>Choose a different course</Text>
      </Pressable>

      {isPicked && (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => selectCourse(null)}
        >
          <Text style={styles.buttonText}>Use closest course</Text>
        </Pressable>
      )}

      {otherRoundCourse && (
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          onPress={() => selectCourse(otherRoundCourse.id)}
        >
          <Text style={styles.buttonText}>
            Go to unfinished round at {otherRoundCourse.name}
          </Text>
        </Pressable>
      )}

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.button,
          styles.playButton,
          pressed && styles.pressed,
        ]}
        onPress={handlePlay}
      >
        <Text style={styles.playButtonText}>
          {isResuming ? "Resume round" : "Play"}
        </Text>
      </Pressable>
    </>
  );
}
