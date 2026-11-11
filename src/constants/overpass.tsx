import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

const url = "https://overpass-api.de/api/interpreter";
const nearby_course_query = `[out:json][timeout:25];
nwr["leisure"="golf_course"](around:10000, LAT, LON);
out body geom;`;

export interface Course {
  id: string;
  name: string;
  phone: string;
  website: string;
}

export function useNearbyCourses(location: Location.LocationObject | null) {
  const [data, setData] = useState<Course[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getCourses = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    if (!location) {
      setErrorMsg("Location Not Available");
      setLoading(false);
      return;
    }

    const query = nearby_course_query
      .replace("LAT", String(location.coords.latitude))
      .replace("LON", String(location.coords.longitude));

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          "User-Agent": "GOLFGPSAPP",
        },
        body: "data=" + encodeURIComponent(query),
      });

      if (!response.ok) {
        throw new Error(`Http Error Status: ${response.status}`);
      }

      const jsonResult = await response.json();
      const courses: Course[] = jsonResult.elements.map((course: any) => ({
        id: course.id,
        name: course.tags?.name ?? "Unknown Course",
        phone: course.tags?.phone ?? "No Phone",
        website: course.tags?.website ?? "No Website",
      }));
      setData(courses);
    } catch (error: any) {
      setErrorMsg(error.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [location]);

  useEffect(() => {
    getCourses();
  }, [getCourses]);

  return { data, loading, errorMsg, refreshCourses: getCourses };
}

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLocation = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Permission to access location was denied");
        return;
      }

      let currentLocation = await Location.getCurrentPositionAsync({});
      setLocation(currentLocation);
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to get location");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocation();
  }, []);

  return { location, errorMsg, loading, refreshLocation: fetchLocation };
}
