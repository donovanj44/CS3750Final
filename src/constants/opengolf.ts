import { useCallback } from "react";

import {
  Course,
  distanceMeters,
  LatLon,
  useAsync,
} from "@/constants/overpass";

// © OpenStreetMap contributors (ODbL 1.0) via OpenGolfAPI
const OPENGOLF_BASE_URL = "https://api.opengolfapi.org/api/v1";

const REQUEST_TIMEOUT_MS = 15000;
const NAME_SEARCH_RADIUS_MI = 2;
const NEAREST_SEARCH_RADIUS_MI = 1;
const MAX_NEAREST_MATCH_METERS = 800;

export interface OpenGolfTee {
  tee_key: string;
  tee_name: string;
  tee_color: string | null;
  gender: string | null;
  course_rating: number | null;
  slope: number | null;
  par: number | null;
  yardage: number | null;
}

export interface OpenGolfHole {
  number: number;
  par: number | null;
  stroke_index: number | null;
  yardages: Record<string, number> | null;
}

interface OpenGolfSearchResult {
  id: string;
  course_name: string;
  latitude: number | null;
  longitude: number | null;
  par_total: number | null;
  total_yardage: number | null;
  distance_mi?: number;
}

interface OpenGolfSearchResponse {
  courses: OpenGolfSearchResult[];
  total: number;
}

interface OpenGolfCourseResponse {
  id: string;
  course_name: string;
  latitude: number | null;
  longitude: number | null;
  par_total: number | null;
  tees: OpenGolfTee[] | null;
  holes: OpenGolfHole[] | null;
}

interface OpenGolfFeature {
  geometry: { type: string; coordinates: unknown } | null;
}

interface OpenGolfFeaturesResponse {
  features?: OpenGolfFeature[];
}

export interface CourseDetails {
  openGolfId: string;
  name: string;
  holes: number | null;
  defaultTee: OpenGolfTee | null;
  tees: OpenGolfTee[];
  holesData: OpenGolfHole[];
}

async function fetchJson<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${OPENGOLF_BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Course data request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Course data Http Error Status: ${response.status}`);
  }
  return response.json();
}

function searchCourses(params: Record<string, string | number>) {
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");
  return fetchJson<OpenGolfSearchResponse>(`/courses/search?${query}`);
}

async function findOpenGolfCourse(
  course: Course,
): Promise<OpenGolfSearchResult | null> {
  const hasName = course.name && course.name !== "Unknown Course";

  if (!course.center) {
    if (!hasName) return null;
    const { courses } = await searchCourses({ q: course.name, limit: 1 });
    return courses[0] ?? null;
  }

  const { lat, lon } = course.center;

  if (hasName) {
    const { courses } = await searchCourses({
      q: course.name,
      lat,
      lng: lon,
      radius_mi: NAME_SEARCH_RADIUS_MI,
      limit: 1,
    });
    if (courses[0]) return courses[0];
  }

  const { courses } = await searchCourses({
    lat,
    lng: lon,
    radius_mi: NEAREST_SEARCH_RADIUS_MI,
    limit: 5,
  });
  let nearest: OpenGolfSearchResult | null = null;
  let nearestDistance = Infinity;
  for (const candidate of courses) {
    if (candidate.latitude == null || candidate.longitude == null) continue;
    const distance = distanceMeters(course.center, {
      lat: candidate.latitude,
      lon: candidate.longitude,
    });
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearestDistance <= MAX_NEAREST_MATCH_METERS ? nearest : null;
}

async function loadCourseDetails(course: Course): Promise<CourseDetails | null> {
  const match = await findOpenGolfCourse(course);
  if (!match) return null;

  const detail = await fetchJson<OpenGolfCourseResponse>(
    `/courses/${encodeURIComponent(match.id)}`,
  );
  const coursePar = detail.par_total ?? match.par_total;
  const tees = (detail.tees ?? [])
    .map((tee) => ({ ...tee, par: tee.par ?? coursePar }))
    .sort((a, b) => (b.yardage ?? 0) - (a.yardage ?? 0));

  return {
    openGolfId: detail.id,
    name: detail.course_name,
    holes: detail.holes?.length ?? null,
    defaultTee: tees[0] ?? null,
    tees,
    holesData: detail.holes ?? [],
  };
}


const detailsCache = new Map<string, Promise<CourseDetails | null>>();

export function fetchCourseDetails(course: Course) {
  let cached = detailsCache.get(course.id);
  if (!cached) {
    cached = loadCourseDetails(course);
    detailsCache.set(course.id, cached);
    cached.catch(() => detailsCache.delete(course.id));
  }
  return cached;
}

export function useCourseDetails(course: Course | null) {
  const load = useCallback(
    async () => (course ? fetchCourseDetails(course) : null),
    [course],
  );
  const { refresh, ...result } = useAsync(load);
  return { ...result, refreshCourseDetails: refresh };
}

function flattenPositions(coordinates: unknown): LatLon[] {
  if (!Array.isArray(coordinates)) return [];
  if (typeof coordinates[0] === "number") {
    const [lon, lat] = coordinates;
    return typeof lat === "number" ? [{ lat, lon }] : [];
  }
  return coordinates.flatMap(flattenPositions);
}

export async function fetchOpenGolfHole(
  course: Course,
  holeNumber: number,
): Promise<LatLon[] | null> {
  const details = await fetchCourseDetails(course);
  if (!details) return null;

  const { features } = await fetchJson<OpenGolfFeaturesResponse>(
    `/features?course=${encodeURIComponent(details.openGolfId)}&hole=${holeNumber}`,
  );
  const coordinates = (features ?? []).flatMap((feature) =>
    flattenPositions(feature.geometry?.coordinates),
  );
  return coordinates.length > 0 ? coordinates : null;
}

function samePoint(a: LatLon, b: LatLon) {
  return a.lat === b.lat && a.lon === b.lon;
}

async function loadOpenGolfGreen(
  course: Course,
  holeNumber: number,
): Promise<LatLon[] | null> {
  const details = await fetchCourseDetails(course);
  if (!details) return null;

  const { features } = await fetchJson<OpenGolfFeaturesResponse>(
    `/features?course=${encodeURIComponent(details.openGolfId)}&hole=${holeNumber}&type=green`,
  );
  const green = (features ?? []).find((feature) => feature.geometry);
  const points = flattenPositions(green?.geometry?.coordinates);
  if (points.length > 1 && samePoint(points[0], points[points.length - 1])) {
    points.pop();
  }
  return points.length > 0 ? points : null;
}

const greenCache = new Map<string, Promise<LatLon[] | null>>();

export function fetchOpenGolfGreen(course: Course, holeNumber: number) {
  const key = `${course.id}:${holeNumber}`;
  let cached = greenCache.get(key);
  if (!cached) {
    cached = loadOpenGolfGreen(course, holeNumber);
    greenCache.set(key, cached);
    cached.catch(() => greenCache.delete(key));
  }
  return cached;
}

export function useHoleGreen(course: Course | null, holeNumber: number) {
  const load = useCallback(
    async () => (course ? fetchOpenGolfGreen(course, holeNumber) : null),
    [course, holeNumber],
  );
  const { refresh, ...result } = useAsync(load);
  return { ...result, refreshHoleGreen: refresh };
}
