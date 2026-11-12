import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";

export interface Course {
  id: string;
  name: string;
  phone: string;
  website: string;
}

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  nodes?: number[];
  geometry?: { lat: number; lon: number }[];
}

export interface OverpassResponse {
  elements: OverpassElement[];
  remark?: string;
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const MAX_ROUNDS = 2;
const RETRY_BASE_DELAY_MS = 1000;
const REQUEST_TIMEOUT_MS = 35000;
const SEARCH_RADIUS_METERS = 10000;

class OverpassError extends Error {
  retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = "OverpassError";
    this.retryable = retryable;
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
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
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Request timed out"
        : getErrorMessage(error, "Network error");
    throw new OverpassError(message, true);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new OverpassError(`Http Error Status: ${response.status}`, retryable);
  }

  let json: OverpassResponse;
  try {
    json = await response.json();
  } catch {
    throw new OverpassError("Invalid response from Overpass API", true);
  }

  if (typeof json.remark === "string" && /runtime error/i.test(json.remark)) {
    throw new OverpassError(json.remark, true);
  }

  return json;
}

async function fetchOverpass(query: string) {
  let lastError: unknown = new Error("An unknown error occurred");

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (round > 0) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** (round - 1));
    }

    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        return await fetchFromEndpoint(endpoint, query);
      } catch (error) {
        lastError = error;
        console.warn(
          `Overpass request to ${endpoint} failed: ${getErrorMessage(error, "unknown error")}`,
        );
        if (error instanceof OverpassError && !error.retryable) {
          throw error;
        }
      }
    }
  }

  throw lastError;
}

const NEARBY_COURSES_QUERY = `[out:json][timeout:25];
nwr["leisure"="golf_course"](around:{{RADIUS}}, {{LAT}}, {{LON}});
out body geom;`;

const HOLE_DETAILS_QUERY = `[out:json][timeout:30];
nwr["leisure"="golf_course"]["name"~"{{COURSE_NAME}}"](around:{{RADIUS}}, {{LAT}}, {{LON}})->.courseBoundary;
(
  node["golf"="hole"]["ref"="{{HOLE_NUMBER}}"](area.courseBoundary);
  way["golf"="hole"]["ref"="{{HOLE_NUMBER}}"](area.courseBoundary);
  relation["golf"="hole"]["ref"="{{HOLE_NUMBER}}"](area.courseBoundary);
);
out body;
>;
out skel qt;`;

function fillQuery(template: string, values: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (!(key in values)) {
      throw new Error(`Missing value for query placeholder "${key}"`);
    }
    return String(values[key]);
  });
}

function escapeOverpassRegex(value: string) {
  return value
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"');
}

function parseCourses(json: OverpassResponse): Course[] {
  return (json.elements ?? []).map((element) => ({
    id: `${element.type}/${element.id}`,
    name: element.tags?.name ?? "Unknown Course",
    phone: element.tags?.phone ?? "No Phone",
    website: element.tags?.website ?? "No Website",
  }));
}

async function fetchNearbyCourses(location: Location.LocationObject | null) {
  if (!location) {
    throw new Error("Location Not Available");
  }

  const query = fillQuery(NEARBY_COURSES_QUERY, {
    RADIUS: SEARCH_RADIUS_METERS,
    LAT: location.coords.latitude,
    LON: location.coords.longitude,
  });

  return parseCourses(await fetchOverpass(query));
}

async function fetchHoleDetails(
  courseName: string,
  location: Location.LocationObject | null,
  holeNumber: number,
) {
  if (!location) {
    throw new Error("Location Not Available");
  }
  if (!courseName) {
    throw new Error("Course Name Not Provided");
  }

  const query = fillQuery(HOLE_DETAILS_QUERY, {
    COURSE_NAME: escapeOverpassRegex(courseName),
    RADIUS: SEARCH_RADIUS_METERS,
    LAT: location.coords.latitude,
    LON: location.coords.longitude,
    HOLE_NUMBER: holeNumber,
  });

  return fetchOverpass(query);
}

async function getCurrentLocation() {
  let { status } = await Location.getForegroundPermissionsAsync();
  if (status !== "granted") {
    ({ status } = await Location.requestForegroundPermissionsAsync());
  }
  if (status !== "granted") {
    throw new Error("Permission to access location was denied");
  }

  return Location.getCurrentPositionAsync({});
}

export const AsyncStatus = Object.freeze({
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
});

type AsyncState<T> =
  | { status: typeof AsyncStatus.LOADING }
  | { status: typeof AsyncStatus.SUCCESS; data: T }
  | { status: typeof AsyncStatus.ERROR; errorMsg: string };

function useAsync<T>(load: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    status: AsyncStatus.LOADING,
  });
  const latestRequest = useRef(0);

  const run = useCallback(async () => {
    const requestId = ++latestRequest.current;
    setState({ status: AsyncStatus.LOADING });

    try {
      const data = await load();
      if (requestId === latestRequest.current) {
        setState({ status: AsyncStatus.SUCCESS, data });
      }
    } catch (error) {
      if (requestId === latestRequest.current) {
        setState({
          status: AsyncStatus.ERROR,
          errorMsg: getErrorMessage(error, "An unknown error occurred"),
        });
      }
    }
  }, [load]);

  useEffect(() => {
    run();
  }, [run]);

  return {
    data: state.status === AsyncStatus.SUCCESS ? state.data : null,
    loading: state.status === AsyncStatus.LOADING,
    errorMsg: state.status === AsyncStatus.ERROR ? state.errorMsg : null,
    refresh: run,
  };
}

export function useLocation() {
  const { data, loading, errorMsg, refresh } = useAsync(getCurrentLocation);
  return { location: data, loading, errorMsg, refreshLocation: refresh };
}

export function useNearbyCourses(location: Location.LocationObject | null) {
  const load = useCallback(() => fetchNearbyCourses(location), [location]);
  const { refresh, ...result } = useAsync(load);
  return { ...result, refreshCourses: refresh };
}

export function useHoleDetails(
  courseName: string,
  location: Location.LocationObject | null,
  holeNumber: number,
) {
  const load = useCallback(
    () => fetchHoleDetails(courseName, location, holeNumber),
    [courseName, location, holeNumber],
  );
  const { refresh, ...result } = useAsync(load);
  return { ...result, refreshHoleDetails: refresh };
}
