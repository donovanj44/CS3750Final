import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";

export interface LatLon {
  lat: number;
  lon: number;
}

export interface Course {
  id: string;
  name: string;
  phone: string;
  website: string;
  center: LatLon | null;
}

export interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  tags?: Record<string, string>;
  lat?: number;
  lon?: number;
  nodes?: number[];
  geometry?: LatLon[];
  bounds?: { minlat: number; minlon: number; maxlat: number; maxlon: number };
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

const MAX_ATTEMPTS = MAX_ROUNDS * OVERPASS_ENDPOINTS.length;

async function fetchOverpass(
  query: string,
  attempt = 0,
): Promise<OverpassResponse> {
  const round = Math.floor(attempt / OVERPASS_ENDPOINTS.length);
  const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];

  if (round > 0 && attempt % OVERPASS_ENDPOINTS.length === 0) {
    await sleep(RETRY_BASE_DELAY_MS * 2 ** (round - 1));
  }

  try {
    return await fetchFromEndpoint(endpoint, query);
  } catch (error) {
    console.warn(
      `Overpass request to ${endpoint} failed: ${getErrorMessage(error, "unknown error")}`,
    );
    const isRetryable = !(error instanceof OverpassError) || error.retryable;
    if (!isRetryable || attempt + 1 >= MAX_ATTEMPTS) {
      throw error;
    }
    return fetchOverpass(query, attempt + 1);
  }
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
    .replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
    .replaceAll("\\", String.raw`\\`)
    .replaceAll('"', String.raw`\"`);
}

function getElementCenter(element: OverpassElement): LatLon | null {
  if (element.bounds) {
    const { minlat, minlon, maxlat, maxlon } = element.bounds;
    return { lat: (minlat + maxlat) / 2, lon: (minlon + maxlon) / 2 };
  }
  if (element.lat !== undefined && element.lon !== undefined) {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.geometry?.length) {
    const sum = element.geometry.reduce(
      (acc, point) => ({ lat: acc.lat + point.lat, lon: acc.lon + point.lon }),
      { lat: 0, lon: 0 },
    );
    return {
      lat: sum.lat / element.geometry.length,
      lon: sum.lon / element.geometry.length,
    };
  }
  return null;
}

function parseCourses(json: OverpassResponse): Course[] {
  return (json.elements ?? []).map((element) => ({
    id: `${element.type}/${element.id}`,
    name: element.tags?.name ?? "Unknown Course",
    phone: element.tags?.phone ?? "No Phone",
    website: element.tags?.website ?? "No Website",
    center: getElementCenter(element),
  }));
}

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

export function distanceMeters(a: LatLon, b: LatLon) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) *
      Math.cos(toRadians(b.lat)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export function findClosestCourse(
  courses: Course[],
  location: Location.LocationObject | null,
): Course | null {
  if (!location) return courses[0] ?? null;

  const here = {
    lat: location.coords.latitude,
    lon: location.coords.longitude,
  };
  let closest: Course | null = null;
  let closestDistance = Infinity;
  for (const course of courses) {
    if (!course.center) continue;
    const distance = distanceMeters(here, course.center);
    if (distance < closestDistance) {
      closest = course;
      closestDistance = distance;
    }
  }
  return closest ?? courses[0] ?? null;
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

type AsyncResult<T> = { load: () => Promise<T>; requestId: number } & (
  | { status: typeof AsyncStatus.SUCCESS; data: T }
  | { status: typeof AsyncStatus.ERROR; errorMsg: string }
);

export function useAsync<T>(load: () => Promise<T>) {
  const [requestId, setRequestId] = useState(0);
  const [result, setResult] = useState<AsyncResult<T> | null>(null);

  useEffect(() => {
    let isCurrent = true;

    load()
      .then((data) => {
        if (isCurrent) {
          setResult({ load, requestId, status: AsyncStatus.SUCCESS, data });
        }
      })
      .catch((error) => {
        if (isCurrent) {
          setResult({
            load,
            requestId,
            status: AsyncStatus.ERROR,
            errorMsg: getErrorMessage(error, "An unknown error occurred"),
          });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [load, requestId]);

  const refresh = useCallback(() => {
    setRequestId((id) => id + 1);
  }, []);

  const current =
    result?.load === load && result.requestId === requestId ? result : null;
  const status = current?.status ?? AsyncStatus.LOADING;

  return {
    data: current?.status === AsyncStatus.SUCCESS ? current.data : null,
    loading: status === AsyncStatus.LOADING,
    errorMsg: current?.status === AsyncStatus.ERROR ? current.errorMsg : null,
    refresh,
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
