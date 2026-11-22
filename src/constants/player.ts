import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const PLAYER_ID_KEY = "playerId";
const PLAYER_NAME_KEY = "playerName";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "unknown error";
}

export async function getPlayerId(): Promise<string | null> {
  try {
    const existing = await AsyncStorage.getItem(PLAYER_ID_KEY);
    if (existing != null) {
      return existing;
    }
    const id = Crypto.randomUUID();
    await AsyncStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch (error) {
    console.warn(`error getting ${PLAYER_ID_KEY}: ${getErrorMessage(error)}`);
    return null;
  }
}

export async function loadPlayerName(): Promise<string | null> {
  try {
    const name = await AsyncStorage.getItem(PLAYER_NAME_KEY);
    return name?.trim() ? name : null;
  } catch (error) {
    console.warn(`error fetching ${PLAYER_NAME_KEY}: ${getErrorMessage(error)}`);
    return null;
  }
}

export async function savePlayerName(name: string) {
  try {
    await AsyncStorage.setItem(PLAYER_NAME_KEY, name.trim());
  } catch (error) {
    console.warn(`error saving ${PLAYER_NAME_KEY}: ${getErrorMessage(error)}`);
  }
}
