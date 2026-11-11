import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";


const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const MAX_ROUNDS = 2;
const RETRY_BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 35000;

class OverpassError extends Error {
  constructor(message: string, public retryable: boolean) {
    super(message);
    this.name = "OverpassError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromEndpoint(endpoint: string, query: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "GOLFGPSAPP",
      },
      body: "data=" + encodeURIComponent(query),
      signal: controller.signal,
    });
  } catch (error: any) {
    const message = error?.name === "AbortError" ? "Request timed out" : error?.message || "Network error";
    throw new OverpassError(message, true);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new OverpassError(`Http Error Status: ${response.status}`, retryable);
  }

  let json: any;
  try {
    json = await response.json();
  } catch {
    throw new OverpassError("Invalid response from Overpass API", true);
  }

  if (typeof json?.remark === "string" && /runtime error/i.test(json.remark)) {
    throw new OverpassError(json.remark, true);
  }

  return json;
}

async function fetchOverpass(query: string) {
  let lastError: Error = new Error("An unknown error occurred");

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (round > 0) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (round - 1));
    }

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        return await fetchFromEndpoint(endpoint, query);
      } catch (error: any) {
        lastError = error;
        console.warn(`Overpass request to ${endpoint} failed: ${error.message}`);
        if (error instanceof OverpassError && !error.retryable) {
          throw error;
        }
      }
    }
  }

  throw lastError;
}

const nearby_course_query = `[out:json][timeout:25];
nwr["leisure"="golf_course"](around:10000, LAT, LON);
out body geom;`;
const hole_details_query = `[out:json][timeout:30];
nwr["leisure"="golf_course"]["name"~"COURSE_NAME"](around:10000, LAT, LON)->.courseBoundary;
(
  node["golf"="hole"]["ref"="HOLE_NUMBER"](area.courseBoundary);
  way["golf"="hole"]["ref"="HOLE_NUMBER"](area.courseBoundary);
  relation["golf"="hole"]["ref"="HOLE_NUMBER"](area.courseBoundary);
);
out body;
>;
out skel qt;`;

function escapeOverpassString(value: string) {
  return value
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

export function useNearbyCourses(location: Location.LocationObject | null) {
  const [data, setData] = useState<any | null>(null);
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
      const jsonResult = await fetchOverpass(query);
      setData(jsonResult);
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

export function useHoleDetails(courseName: string, location: Location.LocationObject | null, holeNumber: number) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const getHoleDetails = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    if (!location) {
      setErrorMsg("Location Not Available");
      setLoading(false);
      return;
    }

    if (!courseName) {
      setErrorMsg("Course Name Not Provided");
      setLoading(false);
      return;
    }

    const query = hole_details_query
      .replace("COURSE_NAME", () => escapeOverpassString(courseName))
      .replace("LAT", String(location.coords.latitude))
      .replace("LON", String(location.coords.longitude))
      .replace(/HOLE_NUMBER/g, String(holeNumber));

    try {
      const jsonResult = await fetchOverpass(query);
      setData(jsonResult);
    } catch (error: any) {
      setErrorMsg(error.message || "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  }, [courseName, location, holeNumber]);

  useEffect(() => {
    getHoleDetails();
  }, [getHoleDetails]);

  return { data, loading, errorMsg, refreshHoleDetails: getHoleDetails };
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
