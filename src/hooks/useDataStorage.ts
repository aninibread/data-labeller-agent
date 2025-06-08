import { useState, useEffect } from "react";
import {
  createSession,
  getSession,
  getSessions,
  updateSessionResults,
  completeSession,
  deleteSession,
  type LabelingSession,
} from "@/lib/dataStorage";
import type { DataItem, LabelResult } from "@/lib/labelingAgent";
import type { LabelingIntent } from "@/components/data-labeler/IntentCapture";

type SessionMetadata = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  status?: "in_progress" | "completed";
};

/**
 * Hook for interacting with the data storage system
 */
export function useDataStorage() {
  const [sessions, setSessions] = useState<SessionMetadata[]>([]);
  const [currentSession, setCurrentSession] = useState<LabelingSession | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  /**
   * Load all sessions from storage
   */
  const loadSessions = () => {
    try {
      const storedSessions = getSessions();
      setSessions(storedSessions);
      return storedSessions;
    } catch (err) {
      setError("Failed to load sessions");
      console.error(err);
      return [];
    }
  };

  /**
   * Load a specific session by ID
   */
  const loadSession = (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const session = getSession(sessionId);

      if (!session) {
        setError(`Session ${sessionId} not found`);
        setCurrentSession(null);
      } else {
        setCurrentSession(session);
      }

      return session;
    } catch (err) {
      setError("Failed to load session");
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Create a new labeling session
   */
  const startNewSession = (
    name: string,
    data: DataItem[],
    intent: LabelingIntent
  ) => {
    setLoading(true);
    setError(null);

    try {
      const newSession = createSession(name, data, intent);
      setCurrentSession(newSession);
      loadSessions(); // Refresh sessions list
      return newSession;
    } catch (err) {
      setError("Failed to create new session");
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update a session with new labeling results
   */
  const saveResults = (sessionId: string, results: LabelResult[]) => {
    setLoading(true);
    setError(null);

    try {
      const updatedSession = updateSessionResults(sessionId, results);

      if (updatedSession) {
        setCurrentSession(updatedSession);
        loadSessions(); // Refresh sessions list
      } else {
        setError(`Session ${sessionId} not found`);
      }

      return updatedSession;
    } catch (err) {
      setError("Failed to save results");
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Mark a session as completed
   */
  const finishSession = (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const finishedSession = completeSession(sessionId);

      if (finishedSession) {
        setCurrentSession(finishedSession);
        loadSessions(); // Refresh sessions list
      } else {
        setError(`Session ${sessionId} not found`);
      }

      return finishedSession;
    } catch (err) {
      setError("Failed to finish session");
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete a session
   */
  const removeSession = (sessionId: string) => {
    setLoading(true);
    setError(null);

    try {
      const success = deleteSession(sessionId);

      if (success) {
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
        }

        loadSessions(); // Refresh sessions list
      } else {
        setError(`Failed to delete session ${sessionId}`);
      }

      return success;
    } catch (err) {
      setError("Failed to delete session");
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sessions,
    currentSession,
    loading,
    error,
    loadSessions,
    loadSession,
    startNewSession,
    saveResults,
    finishSession,
    removeSession,
  };
}
