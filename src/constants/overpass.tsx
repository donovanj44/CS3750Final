import * as Location from "expo-location";
import { useEffect, useState } from "react";

const url = "https://overpass-api.de";
const nearby_course_query = `[out:json][timeout:25];
nwr["leisure"="golf_course"](around:5000, LAT, LON);
out body geom;`;

export async function getNearbyCourses() {}

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
