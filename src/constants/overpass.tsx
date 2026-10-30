import * as Location from "expo-location";
import { useEffect, useState } from "react";

const url = "https://overpass-api.de";
const nearby_course_query = `[out:json][timeout:25];
nwr["leisure"="golf_course"](around:5000, LAT, LON);
out body geom;`;

export function useNearbyCourses(location: Location.LocationObject | null) {
  const [data, setData] = useState<JSON | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getCourses = async () => {
    setLoading(true);
    setErrorMsg(null);
    if (!location) {
      setErrorMsg("Location Not Avalible");
      return {
        data,
        loading,
        errorMsg,
        func: null,
      };
    }

    let query = nearby_course_query
      .replace("LAT", String(location.coords.latitude))
      .replace("LON", String(location.coords.longitude));

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "data=" + encodeURIComponent(query),
      });

      if (!response.ok) {
        setErrorMsg("Http Error Status: ${response.status}");
      }

      setData(await response.json());
    } catch (error: any) {
      setErrorMsg(error.message);
    }
  };

  useEffect(() => {
    getCourses();
  }, []);

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
