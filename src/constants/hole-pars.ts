import { useCallback } from "react";

import { fetchCourseDetails } from "@/constants/opengolf";
import { Course, fetchOverpassPars, useAsync } from "@/constants/overpass";

function warnLookupFailed(source: string, error: unknown) {
  console.warn(
    `${source} par lookup failed: ${
      error instanceof Error ? error.message : "unknown error"
    }`,
  );
  return null;
}

async function loadHolePars(course: Course): Promise<Record<number, number>> {
  const [overpassPars, details] = await Promise.all([
    fetchOverpassPars(course).catch((error) =>
      warnLookupFailed("Overpass", error),
    ),
    fetchCourseDetails(course).catch((error) =>
      warnLookupFailed("OpenGolfAPI", error),
    ),
  ]);

  const pars: Record<number, number> = {};
  for (const hole of details?.holesData ?? []) {
    if (hole.par != null) pars[hole.number] = hole.par;
  }
  return { ...pars, ...overpassPars };
}

const parsCache = new Map<string, Promise<Record<number, number>>>();

export function fetchHolePars(course: Course) {
  let cached = parsCache.get(course.id);
  if (!cached) {
    cached = loadHolePars(course);
    parsCache.set(course.id, cached);
    cached.catch(() => parsCache.delete(course.id));
  }
  return cached;
}

export function useHolePars(course: Course | null) {
  const load = useCallback(
    async () => (course ? fetchHolePars(course) : null),
    [course],
  );
  const { refresh, ...result } = useAsync(load);
  return { ...result, refreshHolePars: refresh };
}
