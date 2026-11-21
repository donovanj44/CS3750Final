import {
  ActionDispatch,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useReducer,
  useState,
} from "react";

import { CurrentRound, roundStorage } from "@/constants/round-storage";

type RoundState = CurrentRound | null;

export type RoundAction =
  | {
      type: "started";
      courseId: string;
      courseName: string;
      teeKey: string | null;
    }
  | { type: "holeChanged"; delta: number; holeCount: number }
  | { type: "scoreChanged"; holeNumber: number; strokes: number }
  | { type: "loaded"; round: RoundState }
  | { type: "finished" };

function roundReducer(state: RoundState, action: RoundAction): RoundState {
  switch (action.type) {
    case "started": {
      if (state?.courseId === action.courseId) {
        return state;
      }
      return {
        courseId: action.courseId,
        courseName: action.courseName,
        teeKey: action.teeKey,
        startedAt: new Date().toISOString(),
        holeNumber: 1,
        scores: {},
      };
    }
    case "holeChanged": {
      if (!state) return state;
      const holeNumber = Math.min(
        Math.max(state.holeNumber + action.delta, 1),
        action.holeCount,
      );
      return { ...state, holeNumber };
    }
    case "scoreChanged": {
      if (!state) return state;
      return {
        ...state,
        scores: {
          ...state.scores,
          [action.holeNumber]: Math.max(action.strokes, 1),
        },
      };
    }
    case "loaded": {
      return state ?? action.round;
    }
    case "finished": {
      return null;
    }
  }
}

const RoundContext = createContext<RoundState>(null);
const RoundDispatchContext = createContext<ActionDispatch<[RoundAction]>>(
  () => {},
);

type RoundProviderProps = {
  children: ReactNode;
};

export function RoundProvider({ children }: Readonly<RoundProviderProps>) {
  const [round, dispatch] = useReducer(roundReducer, null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    roundStorage.loadCurrentRound().then((savedRound) => {
      if (!isCurrent) return;
      dispatch({ type: "loaded", round: savedRound });
      setIsLoaded(true);
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (round) {
      roundStorage.saveCurrentRound(round);
    } else {
      roundStorage.clearCurrentRound();
    }
  }, [round, isLoaded]);

  return (
    <RoundContext value={round}>
      <RoundDispatchContext value={dispatch}>{children}</RoundDispatchContext>
    </RoundContext>
  );
}

export function useRound() {
  return useContext(RoundContext);
}

export function useRoundDispatch() {
  return useContext(RoundDispatchContext);
}
