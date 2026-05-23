import { VibeAnalysisResult, Participant } from "../types";

const SESSION_KEY = "hangout-session-v1";
const UI_KEY = "hangout-ui-v1";

export interface HangoutPersistedSession {
  version: 1;
  savedAt: string;
  analysisResult: VibeAnalysisResult;
  location: { latitude: number; longitude: number } | null;
  stage: "reveal" | "gameplay";
}

export interface HangoutUiPrefs {
  sidebarCollapsed: boolean;
  cabinetOpen: boolean;
  leaderboardOpen: boolean;
  codexOpen: boolean;
  playersBarCollapsed: boolean;
}

const defaultUiPrefs: HangoutUiPrefs = {
  sidebarCollapsed: false,
  cabinetOpen: true,
  leaderboardOpen: true,
  codexOpen: false,
  playersBarCollapsed: false,
};

function trimHeavyAssets(result: VibeAnalysisResult): VibeAnalysisResult {
  return {
    ...result,
    participants: result.participants.map((p) => ({
      ...p,
      cartoonSvg: undefined,
    })),
    gameConfig: {
      ...result.gameConfig,
      backdropSvg: undefined,
    },
  };
}

export function loadSession(): HangoutPersistedSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HangoutPersistedSession;
    if (parsed?.version !== 1 || !parsed.analysisResult?.gameConfig) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(session: Omit<HangoutPersistedSession, "version" | "savedAt">): boolean {
  const payload: HangoutPersistedSession = {
    version: 1,
    savedAt: new Date().toISOString(),
    ...session,
  };

  const tryWrite = (data: HangoutPersistedSession) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  };

  try {
    tryWrite(payload);
    return true;
  } catch (err) {
    const isQuota =
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.code === 22);
    if (!isQuota) {
      console.warn("Failed to save hangout session:", err);
      return false;
    }
  }

  try {
    tryWrite({
      ...payload,
      analysisResult: trimHeavyAssets(payload.analysisResult),
    });
    return true;
  } catch (err) {
    console.warn("Failed to save trimmed hangout session:", err);
    return false;
  }
}

export function updateParticipantScores(participants: Participant[]): void {
  const existing = loadSession();
  if (!existing) return;
  saveSession({
    ...existing,
    analysisResult: {
      ...existing.analysisResult,
      participants,
    },
  });
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function hasSavedSession(): boolean {
  return loadSession() !== null;
}

export function loadUiPrefs(): HangoutUiPrefs {
  try {
    const raw = localStorage.getItem(UI_KEY);
    if (!raw) return defaultUiPrefs;
    return { ...defaultUiPrefs, ...JSON.parse(raw) };
  } catch {
    return defaultUiPrefs;
  }
}

export function saveUiPrefs(prefs: Partial<HangoutUiPrefs>): void {
  const next = { ...loadUiPrefs(), ...prefs };
  localStorage.setItem(UI_KEY, JSON.stringify(next));
}
