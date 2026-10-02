"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MAX_SESSION_TASKS } from "@focusUp/shared-types";

import {
  useAddSessionTask,
  useDeleteSessionTask,
  useSessionTasks,
  useUpdateSessionTask,
} from "@/hooks/useSessionRoom";

interface SessionTasksListProps {
  sessionId: string;
}

/** What I plan to work on in this session (at most 10). Only I can see it. */
export function SessionTasksList({ sessionId }: SessionTasksListProps) {
  const { data: tasks = [] } = useSessionTasks(sessionId);
  const addTask = useAddSessionTask(sessionId);
  const updateTask = useUpdateSessionTask(sessionId);
  const deleteTask = useDeleteSessionTask(sessionId);
  const [text, setText] = useState("");

  const full = tasks.length >= MAX_SESSION_TASKS;

  const submit = () => {
    const value = text.trim();
    if (!value || full) return;
    addTask.mutate(
      { text: value },
      {
        onSuccess: () => setText(""),
        onError: (error) => toast.error(error.message),
      },
    );
  };

  return (
    <section aria-label="Tasks">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tasks</h3>
        <span className="text-[11px] text-slate-400">
          {tasks.length}/{MAX_SESSION_TASKS}
        </span>
      </div>

      <ul className="space-y-1.5">
        {tasks.map((task) => (
          <li key={task.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={task.done}
              onChange={(event) => updateTask.mutate({ taskId: task.id, done: event.target.checked })}
              aria-label={`Mark "${task.text}" as done`}
              className="h-4 w-4 shrink-0 accent-[#0245A3]"
            />
            <span className={task.done ? "min-w-0 flex-1 truncate text-sm text-slate-400 line-through" : "min-w-0 flex-1 truncate text-sm text-slate-700"}>
              {task.text}
            </span>
            <button
              type="button"
              onClick={() => deleteTask.mutate(task.id)}
              aria-label={`Delete "${task.text}"`}
              className="rounded p-1 text-slate-300 hover:text-red-500 focus-visible:text-red-500 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="mt-2 flex gap-2"
      >
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={120}
          disabled={full}
          placeholder={full ? "10 tasks is the limit" : "Add a task"}
          aria-label="New task"
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0245A3] disabled:bg-slate-50"
        />
        <button
          type="submit"
          disabled={!text.trim() || full || addTask.isPending}
          aria-label="Add task"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#0245A3]/30 text-[#0245A3] hover:bg-[#0245A3]/5 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </section>
  );
}
