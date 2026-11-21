import * as Location from "expo-location";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";

import {
  Course,
  findClosestCourse,
  useLocation,
  useNearbyCourses,
} from "@/constants/overpass";

type CoursesContextValue = {
  location: Location.LocationObject | null;
  locationLoading: boolean;
  locationError: string | null;
  courses: Course[] | null;
  coursesLoading: boolean;
  coursesError: string | null;
  refreshCourses: () => void;
  selectedCourseId: string | null;
  selectCourse: (courseId: string | null) => void;
};

const CoursesContext = createContext<CoursesContextValue | null>(null);

type CoursesProviderProps = {
  children: ReactNode;
};

export function CoursesProvider({ children }: Readonly<CoursesProviderProps>) {
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
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
    null,
  );

  const value = useMemo(
    () => ({
      location,
      locationLoading,
      locationError,
      courses,
      coursesLoading,
      coursesError,
      refreshCourses,
      selectedCourseId,
      selectCourse: setSelectedCourseId,
    }),
    [
      location,
      locationLoading,
      locationError,
      courses,
      coursesLoading,
      coursesError,
      refreshCourses,
      selectedCourseId,
    ],
  );

  return <CoursesContext value={value}>{children}</CoursesContext>;
}

export function useCourses() {
  const value = useContext(CoursesContext);
  if (!value) {
    throw new Error("useCourses must be used inside a CoursesProvider");
  }
  return value;
}

export function useCurrentCourse() {
  const { location, courses, selectedCourseId } = useCourses();
  const pickedCourse =
    courses?.find((course) => course.id === selectedCourseId) ?? null;
  const course = pickedCourse ?? findClosestCourse(courses ?? [], location);
  return { pickedCourse, course };
}

export function getCoursesStatusMessage({
  locationLoading,
  locationError,
  coursesLoading,
  coursesError,
  courses,
}: CoursesContextValue) {
  if (locationLoading) return "Getting your location...";
  if (locationError) return `Error: ${locationError}`;
  if (coursesLoading) return "Loading nearby courses...";
  if (coursesError) return `Error: ${coursesError}`;
  if ((courses?.length ?? 0) === 0) return "No courses found nearby.";
  return null;
}
