import { Stack, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ColorSchemeName,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import MapView, { Camera, Marker, Polygon, Polyline } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HoleHeader from "@/components/hole-header";
import PlayerNameModal from "@/components/player-name-modal";
import ScorePanel from "@/components/score-panel";
import {
  bearingDegrees,
  cameraForCoordinates,
  greenDistances,
  holeLocationService,
  POINT_SPAN_METERS,
  remainingHolePoints,
  useHoleCoordinates,
} from "@/constants/hole-location";
import {
  fetchOpenGolfGreen,
  OpenGolfHole,
  useCourseDetails,
  useHoleGreen,
} from "@/constants/opengolf";
import {
  distanceMeters,
  LatLon,
  useWatchedLocation,
} from "@/constants/overpass";
import { loadPlayerName, savePlayerName } from "@/constants/player";
import { finishRound, roundStorage } from "@/constants/round-storage";
import { syncPendingRounds } from "@/constants/round-sync";
import { Colors, createStyles } from "@/constants/theme";
import { useCourses, useCurrentCourse } from "@/context/courses-context";
import { useRound, useRoundDispatch } from "@/context/round-context";
import { useSetIsTabBarHidden } from "@/context/tab-bar-context";

const DEFAULT_HOLE_COUNT = 18;
const METERS_TO_YARDS = 1.09361;
const MAX_LIVE_YARDS = 1000;
const HUD_MARGIN = 12;
const APPROACH_STEP_YARDS = 25;
const MIN_TAG_SPACING_YARDS = 30;

function isNearTarget(here: LatLon, target: LatLon) {
  return distanceMeters(here, target) * METERS_TO_YARDS <= MAX_LIVE_YARDS;
}

function pathLengthMeters(points: LatLon[]) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += distanceMeters(points[i - 1], points[i]);
  }
  return total;
}

type Yardage = {
  yards: number | null;
  frontBack: { front: number; back: number } | null;
  yardageLabel: string;
};

function getYardage(
  holeCoordinates: LatLon[] | null,
  green: LatLon[] | null,
  here: LatLon | null,
): Yardage {
  const pin = holeCoordinates?.[holeCoordinates.length - 1];
  const tee = holeCoordinates?.[0];
  const target = pin ?? green?.[0];
  if (!target) {
    return { yards: null, frontBack: null, yardageLabel: "To green" };
  }

  const isLive = here != null && isNearTarget(here, target);
  const from = isLive ? here : tee;

  if (green?.length && from) {
    const { front, center, back } = greenDistances(from, green);
    return {
      yards: center * METERS_TO_YARDS,
      frontBack: {
        front: front * METERS_TO_YARDS,
        back: back * METERS_TO_YARDS,
      },
      yardageLabel: isLive ? "To green" : "From tee",
    };
  }

  if (isLive) {
    return {
      yards: distanceMeters(here, target) * METERS_TO_YARDS,
      frontBack: null,
      yardageLabel: "To green",
    };
  }
  return {
    yards: holeCoordinates
      ? pathLengthMeters(holeCoordinates) * METERS_TO_YARDS
      : null,
    frontBack: null,
    yardageLabel: "Hole length",
  };
}

type DistanceTag = { point: LatLon; yards: number };

function yardsBetween(a: LatLon, b: LatLon) {
  return distanceMeters(a, b) * METERS_TO_YARDS;
}

function getShotOrigin(holeCoordinates: LatLon[] | null, here: LatLon | null) {
  const tee = holeCoordinates?.[0];
  const pin = holeCoordinates?.at(-1);
  if (!tee || !pin) return null;
  return here && isNearTarget(here, pin) ? here : tee;
}

function getDistanceTags(
  holeCoordinates: LatLon[] | null,
  origin: LatLon | null,
): DistanceTag[] {
  const tee = holeCoordinates?.[0];
  const pin = holeCoordinates?.at(-1);
  if (!holeCoordinates || !tee || !pin || !origin || holeCoordinates.length < 2) {
    return [];
  }

  const isLive = origin !== tee;
  const originToPin = distanceMeters(origin, pin);

  const tags: DistanceTag[] = [];
  let lastTagged = origin;
  for (const point of holeCoordinates.slice(1, -1)) {
    if (isLive && distanceMeters(point, pin) >= originToPin) continue;
    if (yardsBetween(point, lastTagged) < MIN_TAG_SPACING_YARDS) continue;
    if (yardsBetween(point, pin) < MIN_TAG_SPACING_YARDS) continue;
    tags.push({
      point,
      yards: Math.round(yardsBetween(origin, point)),
    });
    lastTagged = point;
  }
  tags.push({
    point: pin,
    yards: Math.round(yardsBetween(origin, pin)),
  });
  return tags;
}

function getTotals(scores: Record<number, number>, holesData: OpenGolfHole[]) {
  let totalStrokes = 0;
  let toPar = 0;
  const entries = Object.entries(scores);
  for (const [number, strokes] of entries) {
    const par = holesData.find((hole) => hole.number === Number(number))?.par;
    totalStrokes += strokes;
    if (par != null) toPar += strokes - par;
  }
  return { scoredCount: entries.length, totalStrokes, toPar };
}

type EndRoundButtonProps = {
  disabled: boolean;
  onPress: () => void;
  theme: ColorSchemeName;
};

function EndRoundButton({
  disabled,
  onPress,
  theme,
}: Readonly<EndRoundButtonProps>) {
  const styles = createStyles(theme);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        styles.mapButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
    >
      <Text style={styles.mapButtonText}>End</Text>
    </Pressable>
  );
}

function useHoleCamera(
  holeKey: string | null,
  holeCoordinates: LatLon[] | null,
  greenPolygon: LatLon[] | null,
  here: LatLon | null,
  initialPoint: LatLon | null,
) {
  const viewport = useWindowDimensions();
  const [camera, setCamera] = useState<Camera | undefined>(() =>
    initialPoint
      ? cameraForCoordinates([initialPoint], 0, viewport, POINT_SPAN_METERS)
      : undefined,
  );
  const [cameraKey, setCameraKey] = useState<string | null>(null);

  const tee = holeCoordinates?.[0];
  const green = holeCoordinates?.at(-1);
  if (!holeKey || !holeCoordinates || !tee || !green) return camera;

  const approachYards =
    here && isNearTarget(here, green) ? yardsBetween(here, green) : null;
  const approachStage =
    approachYards == null
      ? "hole"
      : String(Math.ceil(approachYards / APPROACH_STEP_YARDS));
  const nextCameraKey = `${holeKey}:${approachStage}`;
  if (nextCameraKey !== cameraKey) {
    setCameraKey(nextCameraKey);
    const points =
      here && approachYards != null
        ? remainingHolePoints(here, holeCoordinates, greenPolygon)
        : holeCoordinates;
    setCamera(cameraForCoordinates(points, bearingDegrees(tee, green), viewport));
  }
  return camera;
}

export default function CourseMap() {
  const theme = useColorScheme() ?? "dark";
  const themeStyles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const setIsTabBarHidden = useSetIsTabBarHidden();
  const { location } = useCourses();
  const { course } = useCurrentCourse();
  const round = useRound();
  const dispatch = useRoundDispatch();
  const liveLocation = useWatchedLocation();
  const [isNamePromptVisible, setIsNamePromptVisible] = useState(false);

  const holeNumber = round?.holeNumber ?? 1;
  const { data: holeCoordinates, loading: holeLoading } = useHoleCoordinates(
    course,
    holeNumber,
  );
  const { data: details } = useCourseDetails(course);
  const { data: greenPolygon } = useHoleGreen(course, holeNumber);
  const holesData = details?.holesData ?? [];
  const holeCount = details?.holes || DEFAULT_HOLE_COUNT;
  const par = holesData.find((hole) => hole.number === holeNumber)?.par ?? null;

  useEffect(() => {
    setIsTabBarHidden(true);
    return () => setIsTabBarHidden(false);
  }, [setIsTabBarHidden]);

  useEffect(() => {
    if (course && holeNumber < holeCount) {
      void holeLocationService.getHoleCoordinates(course, holeNumber + 1);
      fetchOpenGolfGreen(course, holeNumber + 1).catch(() => null);
    }
  }, [course, holeNumber, holeCount]);

  const tee = holeCoordinates?.[0] ?? null;
  const green = holeCoordinates?.[holeCoordinates.length - 1] ?? null;
  const currentLocation = liveLocation ?? location;
  const here = currentLocation
    ? {
        lat: currentLocation.coords.latitude,
        lon: currentLocation.coords.longitude,
      }
    : null;

  const holeKey = course ? `${course.id}:${holeNumber}` : null;
  const initialPoint = location
    ? { lat: location.coords.latitude, lon: location.coords.longitude }
    : null;
  const camera = useHoleCamera(
    holeKey,
    holeCoordinates,
    greenPolygon,
    here,
    initialPoint,
  );

  const { yards, frontBack, yardageLabel } = getYardage(
    holeCoordinates,
    greenPolygon,
    here,
  );

  const distanceTags = getDistanceTags(
    holeCoordinates,
    getShotOrigin(holeCoordinates, here),
  );

  const scores = round?.scores ?? {};
  const { scoredCount, totalStrokes, toPar } = getTotals(scores, holesData);
  const canFinish = round !== null && scoredCount > 0;

  function confirmFinish() {
    if (!round || !canFinish) return;
    Alert.alert(
      "Finish round?",
      "Your scores will be saved to your round history.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Finish",
          onPress: async () => {
            const completed = finishRound(round, holesData);
            await roundStorage.addCompletedRound(completed);
            await roundStorage.addPendingUpload(completed.id);
            dispatch({ type: "finished" });
            if (await loadPlayerName()) {
              void syncPendingRounds();
              router.back();
            } else {
              setIsNamePromptVisible(true);
            }
          },
        },
      ],
    );
  }

  async function savePlayerNameAndSync(name: string) {
    await savePlayerName(name);
    void syncPendingRounds();
    setIsNamePromptVisible(false);
    router.back();
  }

  function skipPlayerName() {
    setIsNamePromptVisible(false);
    router.back();
  }

  let holeStatus: string | null = null;
  if (holeLoading) holeStatus = `Finding hole ${holeNumber}...`;
  else if (!holeCoordinates?.length) holeStatus = `Hole ${holeNumber} isn't mapped`;

  const lineColor = theme === "dark" ? Colors.dark.accentBorder : Colors.light.accent;

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: course?.name ?? "Course Map",
          headerRight: () => (
            <EndRoundButton
              disabled={!canFinish}
              onPress={confirmFinish}
              theme={theme}
            />
          ),
        }}
      />
      <MapView
        style={styles.map}
        mapType="satellite"
        showsUserLocation
        camera={camera}
      >
        {holeCoordinates && holeCoordinates.length > 1 && (
          <Polyline
            coordinates={holeCoordinates.map((point) => ({
              latitude: point.lat,
              longitude: point.lon,
            }))}
            strokeColor={lineColor}
            strokeWidth={3}
          />
        )}
        {greenPolygon && greenPolygon.length > 2 && (
          <Polygon
            coordinates={greenPolygon.map((point) => ({
              latitude: point.lat,
              longitude: point.lon,
            }))}
            strokeColor={lineColor}
            fillColor={`${lineColor}55`}
            strokeWidth={2}
          />
        )}
        {tee && (
          <Marker
            coordinate={{ latitude: tee.lat, longitude: tee.lon }}
            title="Tee"
            pinColor="blue"
          />
        )}
        {green && (
          <Marker
            coordinate={{ latitude: green.lat, longitude: green.lon }}
            title="Green"
            pinColor="green"
          />
        )}
        {distanceTags.map((tag, index) => (
          <Marker
            key={`${index}:${tag.yards}`}
            coordinate={{ latitude: tag.point.lat, longitude: tag.point.lon }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={themeStyles.distanceTagSlot}>
              <View style={themeStyles.distanceTag}>
                <Text style={themeStyles.distanceTagText}>{tag.yards}</Text>
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      <HoleHeader
        holeNumber={holeNumber}
        holeCount={holeCount}
        par={par}
        yards={yards}
        frontBack={frontBack}
        yardageLabel={yardageLabel}
        top={HUD_MARGIN}
        theme={theme}
      />

      {holeStatus && (
        <View style={[themeStyles.hudPill, styles.statusPill]}>
          <Text style={themeStyles.text}>{holeStatus}</Text>
        </View>
      )}

      <ScorePanel
        holeNumber={holeNumber}
        holeCount={holeCount}
        par={par}
        strokes={scores[holeNumber] ?? null}
        totalStrokes={totalStrokes}
        toPar={toPar}
        canFinish={canFinish}
        bottom={insets.bottom + HUD_MARGIN}
        theme={theme}
        onChangeStrokes={(strokes) =>
          dispatch({ type: "scoreChanged", holeNumber, strokes })
        }
        onChangeHole={(delta) =>
          dispatch({ type: "holeChanged", delta, holeCount })
        }
        onFinish={confirmFinish}
      />

      <PlayerNameModal
        visible={isNamePromptVisible}
        theme={theme}
        onSave={savePlayerNameAndSync}
        onSkip={skipPlayerName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: "100%",
    height: "100%",
  },
  statusPill: {
    top: "45%",
  },
});
