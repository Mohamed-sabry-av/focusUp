"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ReportReason,
  SessionRoomResponse,
  SessionTaskDto,
  type CreateSessionTaskInput,
  type UpdateSessionTaskInput,
} from "@focusUp/shared-types";
import { z } from "zod";

import { apiAction, apiRequest } from "@/lib/api-client";

/** The room view of one session (partner, phase, my title), computed by the server. */
export function useSessionRoom(sessionId: string | null) {
  return useQuery({
    queryKey: ["sessionRoom", sessionId],
    enabled: sessionId !== null,
    queryFn: () => apiRequest(`/sessions/${sessionId}`, { schema: SessionRoomResponse }),
    refetchInterval: 30_000,
  });
}

/** Every change to a session refreshes the places that show it. */
function useRefreshSessions() {
  const queryClient = useQueryClient();
  return (sessionId?: string) => {
    queryClient.invalidateQueries({ queryKey: ["upcomingSessions"] });
    queryClient.invalidateQueries({ queryKey: ["bookings"] });
    queryClient.invalidateQueries({ queryKey: ["userStats"] });
    if (sessionId) queryClient.invalidateQueries({ queryKey: ["sessionRoom", sessionId] });
  };
}

/** The session title is the goal the person wrote; the check-in modal starts from it. */
export function useSetSessionTitle(sessionId: string) {
  const refresh = useRefreshSessions();
  return useMutation({
    mutationFn: (title: string) => apiAction(`/sessions/${sessionId}/goal`, { method: "PATCH", body: { goal: title } }),
    onSuccess: () => refresh(sessionId),
  });
}

// ── Tasks ─────────────────────────────────────────────────────────

export function useSessionTasks(sessionId: string | null) {
  return useQuery({
    queryKey: ["sessionTasks", sessionId],
    enabled: sessionId !== null,
    queryFn: async () => {
      const data = await apiRequest(`/sessions/${sessionId}/tasks`, {
        schema: z.object({ tasks: z.array(SessionTaskDto) }),
      });
      return data.tasks;
    },
  });
}

function useRefreshTasks(sessionId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["sessionTasks", sessionId] });
}

export function useAddSessionTask(sessionId: string) {
  const refresh = useRefreshTasks(sessionId);
  return useMutation({
    mutationFn: (input: CreateSessionTaskInput) =>
      apiRequest(`/sessions/${sessionId}/tasks`, { method: "POST", body: input, schema: SessionTaskDto }),
    onSuccess: refresh,
  });
}

export function useUpdateSessionTask(sessionId: string) {
  const refresh = useRefreshTasks(sessionId);
  return useMutation({
    mutationFn: ({ taskId, ...input }: UpdateSessionTaskInput & { taskId: string }) =>
      apiRequest(`/sessions/${sessionId}/tasks/${taskId}`, { method: "PATCH", body: input, schema: SessionTaskDto }),
    onSuccess: refresh,
  });
}

export function useDeleteSessionTask(sessionId: string) {
  const refresh = useRefreshTasks(sessionId);
  return useMutation({
    mutationFn: (taskId: string) => apiAction(`/sessions/${sessionId}/tasks/${taskId}`, { method: "DELETE" }),
    onSuccess: refresh,
  });
}

// ── Cancel, report and block ──────────────────────────────────────

/** Cancels my booking for a session. The server decides whether it is free or a late cancellation. */
export function useCancelSession() {
  const refresh = useRefreshSessions();
  return useMutation({
    mutationFn: (bookingId: string) => apiAction(`/bookings/${bookingId}`, { method: "DELETE" }),
    onSuccess: () => refresh(),
  });
}

interface ReportAndBlockInput {
  sessionId: string;
  partnerId: string;
  reason: ReportReason;
  description?: string;
}

/** Reports the partner, then blocks them (which cancels this session with no strike). */
export function useReportAndBlock() {
  const refresh = useRefreshSessions();
  return useMutation({
    mutationFn: async ({ sessionId, partnerId, reason, description }: ReportAndBlockInput) => {
      await apiAction("/reports", {
        method: "POST",
        body: { reportedId: partnerId, sessionId, reason, ...(description ? { description } : {}) },
      });
      await apiAction("/blocks", { method: "POST", body: { blockedId: partnerId } });
    },
    onSuccess: () => {
      refresh();
    },
  });
}
