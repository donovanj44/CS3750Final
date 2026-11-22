import { useCallback } from "react";

import { useAsync } from "@/constants/overpass";
import { CompletedRound } from "@/constants/round-storage";
import { DB_BASE_URL } from "@/constants/round-sync";

export const FEED_PAGE_SIZE = 25;
const REQUEST_TIMEOUT_MS = 15000;

export type FeedRound = CompletedRound & { playerName: string };

export interface FeedPage {
  rounds: FeedRound[];
  totalCount: number;
}

interface DbRoundRow {
  id: string;
  course_id: string;
  course_name: string;
  tee_key: string | null;
  started_at: string;
  completed_at: string;
  total_strokes: number;
  total_par: number;
  players: { display_name: string } | null;
  round_holes: { hole_number: number; par: number | null; strokes: number }[] | null;
}

const FEED_SELECT =
  "id,course_id,course_name,tee_key,started_at,completed_at,total_strokes,total_par,players(display_name),round_holes(hole_number,par,strokes)";

function toFeedRound(row: DbRoundRow): FeedRound {
  return {
    id: row.id,
    courseId: row.course_id,
    courseName: row.course_name,
    teeKey: row.tee_key,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    totalStrokes: row.total_strokes,
    totalPar: row.total_par,
    playerName: row.players?.display_name ?? "Unknown player",
    holes: (row.round_holes ?? []).map((hole) => ({
      number: hole.hole_number,
      par: hole.par,
      strokes: hole.strokes,
    })),
  };
}

function parseTotalCount(contentRange: string | null, fallback: number) {
  const total = Number(contentRange?.split("/")[1]);
  return Number.isFinite(total) ? total : fallback;
}

async function fetchFeedPage(page: number): Promise<FeedPage> {
  const params = new URLSearchParams({
    select: FEED_SELECT,
    "round_holes.order": "hole_number.asc",
    order: "completed_at.desc",
    limit: String(FEED_PAGE_SIZE),
    offset: String(page * FEED_PAGE_SIZE),
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${DB_BASE_URL}/rounds?${params.toString()}`, {
      method: "GET",
      headers: { Prefer: "count=exact" },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Feed request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new Error(`Http Error Status: ${response.status}`);
  }

  const rows: DbRoundRow[] = await response.json();
  return {
    rounds: rows.map(toFeedRound),
    totalCount: parseTotalCount(response.headers.get("content-range"), rows.length),
  };
}

export function useFeedPage(page: number) {
  const load = useCallback(() => fetchFeedPage(page), [page]);
  const { refresh, ...result } = useAsync(load);
  return { ...result, refreshFeed: refresh };
}
