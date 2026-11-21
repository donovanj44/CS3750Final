import { useCallback } from "react";

import { fetchOpenGolfHole } from "@/constants/opengolf";
import {
  Course,
  fetchOverpassHole,
  LatLon,
  useAsync,
} from "@/constants/overpass";

const REGION_PADDING = 1.4;
const MIN_REGION_DELTA = 0.002;
const POINT_REGION_DELTA = 0.01;

type HoleSource = (course: Course, holeNumber: number) => Promise<LatLon[] | null>;

class HoleLocationService {
  private readonly cache = new Map<string, Promise<LatLon[] | null>>();

  private readonly sources: { name: string; fetch: HoleSource }[] = [
    { name: "Overpass", fetch: fetchOverpassHole },
    { name: "OpenGolfAPI", fetch: fetchOpenGolfHole },
  ];

  getHoleCoordinates(course: Course, holeNumber: number) {
    const key = `${course.id}:${holeNumber}`;
    let cached = this.cache.get(key);
    if (!cached) {
      cached = this.loadHoleCoordinates(course, holeNumber);
      this.cache.set(key, cached);
      cached
        .then((coordinates) => {
          if (!coordinates) this.cache.delete(key);
        })
        .catch(() => this.cache.delete(key));
    }
    return cached;
  }

  private async loadHoleCoordinates(course: Course, holeNumber: number) {
    for (const source of this.sources) {
      try {
        const coordinates = await source.fetch(course, holeNumber);
        if (coordinates?.length) return coordinates;
      } catch (error) {
        console.warn(
          `${source.name} hole ${holeNumber} lookup failed: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
    }
    return null;
  }
}

export const holeLocationService = new HoleLocationService();

export function useHoleCoordinates(course: Course | null, holeNumber: number) {
  const load = useCallback(
    async () =>
      course ? holeLocationService.getHoleCoordinates(course, holeNumber) : null,
    [course, holeNumber],
  );
  const { refresh, ...result } = useAsync(load);
  return { ...result, refreshHoleCoordinates: refresh };
}

export function regionForCoordinates(coordinates: LatLon[]) {
  const lats = coordinates.map((point) => point.lat);
  const lons = coordinates.map((point) => point.lon);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * REGION_PADDING, MIN_REGION_DELTA),
    longitudeDelta: Math.max((maxLon - minLon) * REGION_PADDING, MIN_REGION_DELTA),
  };
}

export function regionAroundPoint(latitude: number, longitude: number) {
  return {
    latitude,
    longitude,
    latitudeDelta: POINT_REGION_DELTA,
    longitudeDelta: POINT_REGION_DELTA,
  };
}
