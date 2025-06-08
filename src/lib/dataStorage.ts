import type {
  DataItem,
  LabelResult,
  BatchLabelingResult,
} from "./labelingAgent";
import type { LabelingIntent } from "@/components/data-labeler/IntentCapture";

const STORAGE_KEYS = {
  SESSIONS: "data-labeler-sessions",
  SESSION_PREFIX: "data-labeler-session-",
};

export type LabelingSession = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  data: DataItem[];
  intent: LabelingIntent;
  results: LabelResult[];
  status: "in_progress" | "completed";
};

/**
 * Creates a new labeling session
 */
export function createSession(
  name: string,
  data: DataItem[],
  intent: LabelingIntent
): LabelingSession {
  const id = `session-${Date.now()}`;
  const now = new Date().toISOString();

  const session: LabelingSession = {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    data,
    intent,
    results: [],
    status: "in_progress",
  };

  // Save the session
  saveSession(session);

  // Add to sessions list
  const sessions = getSessions();
  saveSessions([...sessions, { id, name, createdAt: now, updatedAt: now }]);

  return session;
}

/**
 * Updates an existing labeling session with new results
 */
export function updateSessionResults(
  sessionId: string,
  results: LabelResult[]
): LabelingSession | null {
  const session = getSession(sessionId);

  if (!session) {
    return null;
  }

  const updatedSession: LabelingSession = {
    ...session,
    results,
    updatedAt: new Date().toISOString(),
  };

  // Save the updated session
  saveSession(updatedSession);

  // Update sessions list
  updateSessionMetadata(sessionId, { updatedAt: updatedSession.updatedAt });

  return updatedSession;
}

/**
 * Marks a session as completed
 */
export function completeSession(sessionId: string): LabelingSession | null {
  const session = getSession(sessionId);

  if (!session) {
    return null;
  }

  const updatedSession: LabelingSession = {
    ...session,
    status: "completed",
    updatedAt: new Date().toISOString(),
  };

  // Save the updated session
  saveSession(updatedSession);

  // Update sessions list
  updateSessionMetadata(sessionId, {
    updatedAt: updatedSession.updatedAt,
    status: "completed",
  });

  return updatedSession;
}

/**
 * Gets a list of all labeling sessions (metadata only)
 */
export function getSessions(): Array<{
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status?: "in_progress" | "completed";
}> {
  try {
    const sessionsJson = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return sessionsJson ? JSON.parse(sessionsJson) : [];
  } catch (err) {
    console.error("Error retrieving sessions:", err);
    return [];
  }
}

/**
 * Gets a specific labeling session by ID
 */
export function getSession(sessionId: string): LabelingSession | null {
  try {
    const sessionJson = localStorage.getItem(
      `${STORAGE_KEYS.SESSION_PREFIX}${sessionId}`
    );
    return sessionJson ? JSON.parse(sessionJson) : null;
  } catch (err) {
    console.error(`Error retrieving session ${sessionId}:`, err);
    return null;
  }
}

/**
 * Deletes a labeling session
 */
export function deleteSession(sessionId: string): boolean {
  try {
    // Remove from storage
    localStorage.removeItem(`${STORAGE_KEYS.SESSION_PREFIX}${sessionId}`);

    // Remove from sessions list
    const sessions = getSessions();
    const updatedSessions = sessions.filter((s) => s.id !== sessionId);
    saveSessions(updatedSessions);

    return true;
  } catch (err) {
    console.error(`Error deleting session ${sessionId}:`, err);
    return false;
  }
}

/**
 * Updates session metadata in the sessions list
 */
function updateSessionMetadata(
  sessionId: string,
  updates: Partial<{
    name: string;
    updatedAt: string;
    status: "in_progress" | "completed";
  }>
): boolean {
  try {
    const sessions = getSessions();
    const updatedSessions = sessions.map((session) =>
      session.id === sessionId ? { ...session, ...updates } : session
    );

    saveSessions(updatedSessions);
    return true;
  } catch (err) {
    console.error(`Error updating session metadata ${sessionId}:`, err);
    return false;
  }
}

/**
 * Internal helper to save a session to localStorage
 */
function saveSession(session: LabelingSession): void {
  localStorage.setItem(
    `${STORAGE_KEYS.SESSION_PREFIX}${session.id}`,
    JSON.stringify(session)
  );
}

/**
 * Internal helper to save the sessions list to localStorage
 */
function saveSessions(
  sessions: Array<{
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    status?: "in_progress" | "completed";
  }>
): void {
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}
