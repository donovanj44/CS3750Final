import { getPlayerId, loadPlayerName } from "@/constants/player";
import { CompletedRound, roundStorage } from "@/constants/round-storage";

export const DB_BASE_URL ="https://db-api.freek4620.me";
const DB_WRITE_TOKEN = process.env.EXPO_PUBLIC_DATABASE_WRITE_TOKEN;
const REQUEST_TIMEOUT_MS = 15000;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}

async function postRows(table: string, rows: unknown) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${DB_BASE_URL}/${table}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DB_WRITE_TOKEN}`,
        Prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${table} upload timed out`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${table} upload Http Error Status: ${response.status} ${detail}`);
  }
}

async function uploadRound(
  round: CompletedRound,
  playerId: string,
  displayName: string,
) {
  await postRows("players", { id: playerId, display_name: displayName });
  await postRows("rounds", {
    id: round.id,
    player_id: playerId,
    client_id: round.id,
    course_id: round.courseId,
    course_name: round.courseName,
    tee_key: round.teeKey,
    started_at: round.startedAt,
    completed_at: round.completedAt,
    total_strokes: round.totalStrokes,
    total_par: round.totalPar,
  });
  if (round.holes.length > 0) {
    await postRows(
      "round_holes",
      round.holes.map((hole) => ({
        round_id: round.id,
        hole_number: hole.number,
        par: hole.par,
        strokes: hole.strokes,
      })),
    );
  }
}

async function runSync() {
  if (!DB_WRITE_TOKEN) {
    console.warn("EXPO_PUBLIC_DATABASE_WRITE_TOKEN is not set; skipping round upload");
    return;
  }

  const [displayName, playerId] = await Promise.all([
    loadPlayerName(),
    getPlayerId(),
  ]);
  if (!displayName || !playerId) return;

  const pendingIds = await roundStorage.loadPendingUploads();
  if (pendingIds.length === 0) return;

  const rounds = await roundStorage.loadCompletedRounds();
  for (const id of pendingIds) {
    const round = rounds.find((candidate) => candidate.id === id);
    if (!round) {
      await roundStorage.removePendingUpload(id);
      continue;
    }
    try {
      await uploadRound(round, playerId, displayName);
      await roundStorage.removePendingUpload(id);
    } catch (error) {
      console.warn(`error uploading round ${id}: ${getErrorMessage(error)}`);
    }
  }
}

let inFlight: Promise<void> | null = null;

export function syncPendingRounds() {
  if (!inFlight) {
    inFlight = runSync().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}
