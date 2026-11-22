import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { useCallback } from "react";

import { OpenGolfHole } from "@/constants/opengolf";
import { useAsync } from "@/constants/overpass";

const CURRENT_ROUND_KEY = "currentRound";
const COMPLETED_ROUNDS_KEY = "completedRounds";
const PENDING_UPLOADS_KEY = "pendingRoundUploads";

export interface CurrentRound {
  courseId: string;
  courseName: string;
  teeKey: string | null;
  startedAt: string;
  holeNumber: number;
  scores: Record<number, number>;
}

export interface RoundHole {
  number: number;
  par: number | null;
  strokes: number;
}

export interface CompletedRound {
  id: string;
  courseId: string;
  courseName: string;
  teeKey: string | null;
  startedAt: string;
  completedAt: string;
  holes: RoundHole[];
  totalStrokes: number;
  totalPar: number;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}

class RoundStorage {
  private async readJson<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value == null ? null : (JSON.parse(value) as T);
    } catch (error) {
      console.warn(`error fetching ${key}: ${getErrorMessage(error)}`);
      return null;
    }
  }

  private async writeJson(key: string, value: unknown) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`error saving ${key}: ${getErrorMessage(error)}`);
    }
  }

  loadCurrentRound() {
    return this.readJson<CurrentRound>(CURRENT_ROUND_KEY);
  }

  saveCurrentRound(round: CurrentRound) {
    return this.writeJson(CURRENT_ROUND_KEY, round);
  }

  async clearCurrentRound() {
    try {
      await AsyncStorage.removeItem(CURRENT_ROUND_KEY);
    } catch (error) {
      console.warn(`error clearing ${CURRENT_ROUND_KEY}: ${getErrorMessage(error)}`);
    }
  }

  async loadCompletedRounds(): Promise<CompletedRound[]> {
    const rounds = await this.readJson<CompletedRound[]>(COMPLETED_ROUNDS_KEY);
    return Array.isArray(rounds) ? rounds : [];
  }

  async addCompletedRound(round: CompletedRound) {
    const rounds = await this.loadCompletedRounds();
    await this.writeJson(COMPLETED_ROUNDS_KEY, [round, ...rounds]);
  }

  async deleteCompletedRound(id: string) {
    const rounds = await this.loadCompletedRounds();
    await this.writeJson(
      COMPLETED_ROUNDS_KEY,
      rounds.filter((round) => round.id !== id),
    );
  }

  async loadPendingUploads(): Promise<string[]> {
    const ids = await this.readJson<string[]>(PENDING_UPLOADS_KEY);
    return Array.isArray(ids) ? ids : [];
  }

  async addPendingUpload(id: string) {
    const ids = await this.loadPendingUploads();
    if (ids.includes(id)) return;
    await this.writeJson(PENDING_UPLOADS_KEY, [...ids, id]);
  }

  async removePendingUpload(id: string) {
    const ids = await this.loadPendingUploads();
    await this.writeJson(
      PENDING_UPLOADS_KEY,
      ids.filter((pendingId) => pendingId !== id),
    );
  }
}

export const roundStorage = new RoundStorage();

export function finishRound(
  round: CurrentRound,
  holesData: OpenGolfHole[],
): CompletedRound {
  const holes = Object.entries(round.scores)
    .map(([number, strokes]) => {
      const holeNumber = Number(number);
      const par =
        holesData.find((hole) => hole.number === holeNumber)?.par ?? null;
      return { number: holeNumber, par, strokes };
    })
    .sort((a, b) => a.number - b.number);

  return {
    id: Crypto.randomUUID(),
    courseId: round.courseId,
    courseName: round.courseName,
    teeKey: round.teeKey,
    startedAt: round.startedAt,
    completedAt: new Date().toISOString(),
    holes,
    totalStrokes: holes.reduce((sum, hole) => sum + hole.strokes, 0),
    totalPar: holes.reduce((sum, hole) => sum + (hole.par ?? 0), 0),
  };
}

export function formatToPar(totalStrokes: number, totalPar: number) {
  if (totalPar === 0) return null;
  const diff = totalStrokes - totalPar;
  if (diff === 0) return "E";
  return diff > 0 ? `+${diff}` : `${diff}`;
}

export function useCompletedRounds() {
  const load = useCallback(() => roundStorage.loadCompletedRounds(), []);
  const { refresh, ...result } = useAsync(load);
  return { ...result, refreshRounds: refresh };
}
