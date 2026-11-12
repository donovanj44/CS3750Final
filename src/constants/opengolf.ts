import { useCallback } from "react";

import { Course, distanceMeters, useAsync } from "@/constants/overpass";

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
  handicap_index: number | null;
  yardages: Record<string, number> | null;
}

interface OpenGolfSearchResult {
  id: string;
  course_name: string;
  lat: number | null;
  lng: number | null;
  par: number | null;
  holes: number | null;
  distance_mi?: number;
}

interface OpenGolfSearchResponse {
  courses: OpenGolfSearchResult[];
  total: number;
}

interface OpenGolfCourseResponse {
  id: string;
  course_name: string;
  par: number | null;
  holes: number | null;
  yardage: number | null;
  tees: OpenGolfTee[] | null;
  holes_data: OpenGolfHole[] | null;
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
    if (candidate.lat == null || candidate.lng == null) continue;
    const distance = distanceMeters(course.center, {
      lat: candidate.lat,
      lon: candidate.lng,
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
  const coursePar = detail.par ?? match.par;
  const tees = (detail.tees ?? [])
    .map((tee) => ({ ...tee, par: tee.par ?? coursePar }))
    .sort((a, b) => (b.yardage ?? 0) - (a.yardage ?? 0));

  return {
    openGolfId: detail.id,
    name: detail.course_name,
    holes: detail.holes ?? match.holes,
    defaultTee: tees[0] ?? null,
    tees,
    holesData: detail.holes_data ?? [],
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
