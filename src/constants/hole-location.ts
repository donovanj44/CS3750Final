import { useCallback } from "react";
import type { Camera } from "react-native-maps";

import { fetchOpenGolfHole } from "@/constants/opengolf";
import {
  Course,
  distanceMeters,
  fetchOverpassHole,
  LatLon,
  useAsync,
} from "@/constants/overpass";

const REGION_PADDING = 1.9;
const MIN_SPAN_METERS = 70;
export const POINT_SPAN_METERS = 1100;
const METERS_PER_DEGREE_LAT = 110540;
const METERS_PER_DEGREE_LON = 111320;
const GOOGLE_METERS_PER_POINT_AT_ZOOM_0 = 156543.03392;
const APPLE_FOV_DEGREES = 30;

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

export type Viewport = { width: number; height: number };

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians: number) {
  return (radians * 180) / Math.PI;
}

export function bearingDegrees(from: LatLon, to: LatLon) {
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const deltaLon = toRadians(to.lon - from.lon);
  const y = Math.sin(deltaLon) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

export function cameraForCoordinates(
  points: LatLon[],
  heading: number,
  viewport: Viewport,
  minSpanMeters = MIN_SPAN_METERS,
): Camera {
  const lats = points.map((point) => point.lat);
  const lons = points.map((point) => point.lon);
  const lat0 = (Math.min(...lats) + Math.max(...lats)) / 2;
  const lon0 = (Math.min(...lons) + Math.max(...lons)) / 2;
  const lonScale = METERS_PER_DEGREE_LON * Math.cos(toRadians(lat0));
  const cos = Math.cos(toRadians(heading));
  const sin = Math.sin(toRadians(heading));

  const rights: number[] = [];
  const ups: number[] = [];
  for (const point of points) {
    const x = (point.lon - lon0) * lonScale;
    const y = (point.lat - lat0) * METERS_PER_DEGREE_LAT;
    rights.push(x * cos - y * sin);
    ups.push(x * sin + y * cos);
  }
  const minRight = Math.min(...rights);
  const maxRight = Math.max(...rights);
  const minUp = Math.min(...ups);
  const maxUp = Math.max(...ups);

  const midRight = (minRight + maxRight) / 2;
  const midUp = (minUp + maxUp) / 2;
  const centerX = midRight * cos + midUp * sin;
  const centerY = -midRight * sin + midUp * cos;
  const latitude = lat0 + centerY / METERS_PER_DEGREE_LAT;
  const longitude = lon0 + centerX / lonScale;

  const spanRight = Math.max((maxRight - minRight) * REGION_PADDING, minSpanMeters);
  const spanUp = Math.max((maxUp - minUp) * REGION_PADDING, minSpanMeters);
  const metersPerPoint = Math.max(
    spanRight / viewport.width,
    spanUp / viewport.height,
  );

  return {
    center: { latitude, longitude },
    heading,
    pitch: 0,
    zoom: Math.log2(
      (GOOGLE_METERS_PER_POINT_AT_ZOOM_0 * Math.cos(toRadians(latitude))) /
        metersPerPoint,
    ),
    altitude:
      (metersPerPoint * viewport.height) /
      2 /
      Math.tan(toRadians(APPLE_FOV_DEGREES / 2)),
  };
}

export function remainingHolePoints(
  here: LatLon,
  holeCoordinates: LatLon[],
  green: LatLon[] | null,
) {
  const pin = holeCoordinates.at(-1);
  if (!pin) return [here];
  const hereToPin = distanceMeters(here, pin);
  const ahead = holeCoordinates.filter(
    (point) => distanceMeters(point, pin) < hereToPin,
  );
  return [here, ...ahead, ...(green?.length ? green : [pin])];
}

export function greenDistances(from: LatLon, green: LatLon[]) {
  const distances = green.map((point) => distanceMeters(from, point));
  const centroid = {
    lat: green.reduce((sum, point) => sum + point.lat, 0) / green.length,
    lon: green.reduce((sum, point) => sum + point.lon, 0) / green.length,
  };
  return {
    front: Math.min(...distances),
    center: distanceMeters(from, centroid),
    back: Math.max(...distances),
  };
}
