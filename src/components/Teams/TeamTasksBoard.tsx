import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Edit2,
  Plus,
  Search,
  Trash2,
  X,
  CheckCircle,
  Loader2,
  AlertCircle,
  Shield,
  LayoutGrid,
  ListChecks,
  Lock,
  ArrowUp,
  Minus,
  ArrowDown,
} from "lucide-react";
import { TeamMember, TeamTask, TaskPriority } from "../../types/social";
import {
  listTeamTasks,
  createTeamTask,
  updateTeamTask,
  deleteTeamTask,
  notifyTaskAssignment,
} from "../../lib/api/teamsApi";
import { supabase } from "../../lib/supabase";
import ChipLoader from "../ui/ChipLoader";

interface Props {
  teamId: string;
  currentUserId: string;
  members: TeamMember[];
  isDarkMode: boolean;
  canManage: boolean; // owner or admin
}

// Priority config
const PRIORITY_CONFIG: Record<TaskPriority, { label: string; icon: React.ReactNode; badge: string; dot: string }> = {
  high: {
    label: "High",
    icon: <ArrowUp className="w-3 h-3" />,
    badge: "bg-red-500/10 text-red-500",
    dot: "bg-red-500",
  },
  medium: {
    label: "Medium",
    icon: <Minus className="w-3 h-3" />,
    badge: "bg-amber-500/10 text-amber-500",
    dot: "bg-amber-400",
  },
  low: {
    label: "Low",
    icon: <ArrowDown className="w-3 h-3" />,
    badge: "bg-slate-500/10 text-[#71767b]",
    dot: "bg-slate-400",
  },
};

export default function TeamTasksBoard({
  teamId,
  currentUserId,
  members,
  isDarkMode,
  canManage,
}: Props) {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Drag states
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<Record<string, boolean>>({
    todo: false,
    in_progress: false,
    done: false,
  });

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<TeamTask | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done">("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Name lookup for notifications
  const myName = useMemo(() => {
    const me = members.find((m) => m.user_id === currentUserId);
    return me?.profile?.name ?? "A team member";
  }, [members, currentUserId]);

  // Load tasks
  const loadTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTeamTasks(teamId);
      setTasks(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load tasks.");
    } finally {
      setLoading(false);
    }
  };

  const silentReload = async () => {
    try {
      const data = await listTeamTasks(teamId);
      setTasks(data);
    } catch {
      /* keep current state on transient errors */
    }
  };

  useEffect(() => {
    loadTasks();
    const channel = supabase
      .channel(`team-tasks-${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_tasks", filter: `team_id=eq.${teamId}` },
        () => silentReload(),
      )
      .subscribe();
    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // Who can move this task?
  const canMoveTask = (task: TeamTask): boolean =>
    !task.assigned_to || task.assigned_to === currentUserId || canManage;

  // Handle Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setFormError("Task title is required."); return; }
    if (title.length > 150) { setFormError("Title must be under 150 characters."); return; }

    setBusy(true);
    setFormError(null);
    try {
      const finalAssignee = canManage ? (assignedTo || null) : null;
      const { task, error: apiErr } = await createTeamTask({
        team_id: teamId,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        assigned_to: finalAssignee,
        created_by: currentUserId,
        due_date: dueDate || null,
      });

      if (apiErr) {
        setFormError(apiErr);
      } else {
        // Notify assignee if it's someone else
        if (finalAssignee && finalAssignee !== currentUserId && task) {
          notifyTaskAssignment(finalAssignee, task.title, teamId, myName);
        }
        setTitle(""); setDescription(""); setAssignedTo(""); setDueDate("");
        setStatus("todo"); setPriority("medium");
        setShowAddModal(false);
        await loadTasks();
      }
    } catch (err: any) {
      setFormError(err?.message ?? "An error occurred.");
    } finally {
      setBusy(false);
    }
  };

  // Handle Edit Task
  const handleEditTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;
    if (!title.trim()) { setFormError("Task title is required."); return; }

    setBusy(true);
    setFormError(null);
    try {
      const finalAssignee = canManage ? (assignedTo || null) : showEditModal.assigned_to;
      const assigneeChanged = canManage && finalAssignee !== showEditModal.assigned_to;

      const { error: apiErr } = await updateTeamTask(showEditModal.id, {
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        assigned_to: finalAssignee,
        due_date: dueDate || null,
      });

      if (apiErr) {
        setFormError(apiErr);
      } else {
        // Notify new assignee
        if (assigneeChanged && finalAssignee && finalAssignee !== currentUserId) {
          notifyTaskAssignment(finalAssignee, title.trim(), teamId, myName);
        }
        setShowEditModal(null);
        await loadTasks();
      }
    } catch (err: any) {
      setFormError(err?.message ?? "An error occurred.");
    } finally {
      setBusy(false);
    }
  };

  // Update task status from drag-drop — guarded by canMoveTask
  const handleUpdateStatus = async (taskId: string, newStatus: "todo" | "in_progress" | "done") => {
    setDraggingTaskId(null);
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    // Guard: only assignee or owner/admin can move assigned tasks
    if (!canMoveTask(task)) return;

    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
    try {
      const { error: apiErr } = await updateTeamTask(taskId, { status: newStatus });
      if (apiErr) { alert("Failed to move task: " + apiErr); await loadTasks(); }
    } catch (err: any) {
      alert("Error moving task: " + err.message);
      await loadTasks();
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return;
    try {
      const { error: apiErr } = await deleteTeamTask(taskId);
      if (apiErr) alert("Failed to delete task: " + apiErr);
      else setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      alert("Error deleting task: " + err.message);
    }
  };

  const openEdit = (task: TeamTask) => {
    setTitle(task.title);
    setDescription(task.description ?? "");
    setAssignedTo(task.assigned_to ?? "");
    setDueDate(task.due_date ? new Date(task.due_date).toISOString().split("T")[0] : "");
    setStatus(task.status);
    setPriority(task.priority ?? "medium");
    setFormError(null);
    setShowEditModal(task);
  };

  const openCreate = (initialStatus: "todo" | "in_progress" | "done" = "todo") => {
    setTitle(""); setDescription(""); setAssignedTo(""); setDueDate("");
    setStatus(initialStatus); setPriority("medium"); setFormError(null);
    setShowAddModal(true);
  };

  // Filtered + split tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (task.description?.toLowerCase() ?? "").includes(searchQuery.toLowerCase());
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "unassigned" && !task.assigned_to) ||
      task.assigned_to === assigneeFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    return matchesSearch && matchesAssignee && matchesPriority;
  });

  const todoTasks = filteredTasks.filter((t) => t.status === "todo");
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
  const doneTasks = filteredTasks.filter((t) => t.status === "done");

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progressPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const filtersActive = searchQuery.trim() !== "" || assigneeFilter !== "all" || priorityFilter !== "all";

  const bgCard = isDarkMode ? "bg-[#17181c] border-[#2f3336]/50" : "bg-white border-slate-200";
  const textTitle = isDarkMode ? "text-[#e7e9ea]" : "text-slate-900";
  const textSub = isDarkMode ? "text-[#71767b]" : "text-slate-500";
  const inputClass = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-all duration-200 ${
    isDarkMode
      ? "bg-[#16181c] border-[#2f3336] text-[#e7e9ea] placeholder-[#71767b] focus:border-[#1e9df1] focus:ring-1 focus:ring-[#1e9df1]"
      : "bg-white border-slate-300 text-slate-900 placeholder-[#71767b] focus:border-[#1e9df1] focus:ring-1 focus:ring-[#1e9df1]"
  }`;
  const labelClass = `block text-xs font-bold mb-1.5 ${isDarkMode ? "text-[#8b98a5]" : "text-slate-600"}`;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className={`p-4 sm:p-5 rounded-2xl border ${bgCard}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e9df1] to-[#7c3aed] flex items-center justify-center flex-shrink-0 shadow-sm">
              <LayoutGrid className="w-5 h-5 text-[#e7e9ea]" />
            </div>
            <div className="min-w-0">
              <h2 className={`text-base font-bold ${textTitle}`}>Task Board</h2>
              <p className={`text-xs ${textSub} flex items-center gap-1.5`}>
                <ListChecks className="w-3.5 h-3.5" />
                {totalCount === 0 ? "No tasks yet" : `${doneCount}/${totalCount} done · ${progressPct}% complete`}
              </p>
            </div>
          </div>
          <button
            onClick={() => openCreate("todo")}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1e9df1] to-[#7c3aed] text-[#e7e9ea] text-sm font-semibold hover:from-[#1677cc] hover:to-[#6d28d9] shadow-md hover:shadow-lg transition-all duration-200 flex items-center gap-1.5 active:scale-95 flex-shrink-0"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Task</span>
          </button>
        </div>

        {/* Progress bar */}
        {totalCount > 0 && (
          <div className={`h-1.5 rounded-full overflow-hidden mb-4 ${isDarkMode ? "bg-[#16181c]" : "bg-slate-100"}`}>
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1e9df1] to-emerald-500 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDarkMode ? "text-slate-500" : "text-[#71767b]"}`} />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className={`${inputClass} sm:max-w-[180px]`}
          >
            <option value="all">All assignees</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.user_id} value={m.user_id}>
                {m.profile?.name || "Member"}
              </option>
            ))}
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className={`${inputClass} sm:max-w-[150px]`}
          >
            <option value="all">All priorities</option>
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🟢 Low</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={loadTasks} className="underline text-xs hover:text-red-300">Retry</button>
        </div>
      )}

      {/* Kanban Board */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <ChipLoader size="lg" />
          <p className={`text-sm ${textSub} mt-2`}>Loading task board...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <TaskColumn
            title="To Do" status="todo" count={todoTasks.length} tasks={todoTasks}
            isDarkMode={isDarkMode} bgCard={bgCard} textTitle={textTitle} textSub={textSub}
            currentUserId={currentUserId} canManage={canManage} canMoveTask={canMoveTask}
            onEdit={openEdit} onDelete={handleDeleteTask} onAdd={() => openCreate("todo")}
            onUpdateStatus={handleUpdateStatus}
            dragOver={dragOverColumn.todo}
            setDragOver={(a) => setDragOverColumn((p) => ({ ...p, todo: a }))}
            dotAccent="bg-slate-400" draggingTaskId={draggingTaskId} setDraggingTaskId={setDraggingTaskId}
            filtersActive={filtersActive}
          />
          <TaskColumn
            title="In Progress" status="in_progress" count={inProgressTasks.length} tasks={inProgressTasks}
            isDarkMode={isDarkMode} bgCard={bgCard} textTitle={textTitle} textSub={textSub}
            currentUserId={currentUserId} canManage={canManage} canMoveTask={canMoveTask}
            onEdit={openEdit} onDelete={handleDeleteTask} onAdd={() => openCreate("in_progress")}
            onUpdateStatus={handleUpdateStatus}
            dragOver={dragOverColumn.in_progress}
            setDragOver={(a) => setDragOverColumn((p) => ({ ...p, in_progress: a }))}
            dotAccent="bg-[#1e9df1] animate-pulse" draggingTaskId={draggingTaskId} setDraggingTaskId={setDraggingTaskId}
            filtersActive={filtersActive}
          />
          <TaskColumn
            title="Done" status="done" count={doneTasks.length} tasks={doneTasks}
            isDarkMode={isDarkMode} bgCard={bgCard} textTitle={textTitle} textSub={textSub}
            currentUserId={currentUserId} canManage={canManage} canMoveTask={canMoveTask}
            onEdit={openEdit} onDelete={handleDeleteTask} onAdd={() => openCreate("done")}
            onUpdateStatus={handleUpdateStatus}
            dragOver={dragOverColumn.done}
            setDragOver={(a) => setDragOverColumn((p) => ({ ...p, done: a }))}
            dotAccent="bg-emerald-500" draggingTaskId={draggingTaskId} setDraggingTaskId={setDraggingTaskId}
            filtersActive={filtersActive}
          />
        </div>
      )}

      {/* CREATE MODAL */}
      {showAddModal && (
        <TaskModal
          mode="create"
          title={title} setTitle={setTitle}
          description={description} setDescription={setDescription}
          status={status} setStatus={setStatus}
          priority={priority} setPriority={setPriority}
          assignedTo={assignedTo} setAssignedTo={setAssignedTo}
          dueDate={dueDate} setDueDate={setDueDate}
          canManage={canManage}
          members={members}
          formError={formError}
          busy={busy}
          isDarkMode={isDarkMode}
          textTitle={textTitle}
          inputClass={inputClass}
          labelClass={labelClass}
          onSubmit={handleCreateTask}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <TaskModal
          mode="edit"
          editTask={showEditModal}
          title={title} setTitle={setTitle}
          description={description} setDescription={setDescription}
          status={status} setStatus={setStatus}
          priority={priority} setPriority={setPriority}
          assignedTo={assignedTo} setAssignedTo={setAssignedTo}
          dueDate={dueDate} setDueDate={setDueDate}
          canManage={canManage}
          canMoveTask={canMoveTask}
          members={members}
          currentUserId={currentUserId}
          formError={formError}
          busy={busy}
          isDarkMode={isDarkMode}
          textTitle={textTitle}
          inputClass={inputClass}
          labelClass={labelClass}
          onSubmit={handleEditTask}
          onClose={() => setShowEditModal(null)}
          onDelete={(id) => { setShowEditModal(null); handleDeleteTask(id); }}
        />
      )}
    </div>
  );
}

// ── TASK MODAL (shared Create / Edit) ────────────────────────────────────────

interface TaskModalProps {
  mode: "create" | "edit";
  editTask?: TeamTask;
  title: string; setTitle: (v: string) => void;
  description: string; setDescription: (v: string) => void;
  status: "todo" | "in_progress" | "done"; setStatus: (v: any) => void;
  priority: TaskPriority; setPriority: (v: TaskPriority) => void;
  assignedTo: string; setAssignedTo: (v: string) => void;
  dueDate: string; setDueDate: (v: string) => void;
  canManage: boolean;
  canMoveTask?: (task: TeamTask) => boolean;
  members: TeamMember[];
  currentUserId?: string;
  formError: string | null;
  busy: boolean;
  isDarkMode: boolean;
  textTitle: string;
  inputClass: string;
  labelClass: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

function TaskModal({
  mode, editTask, title, setTitle, description, setDescription,
  status, setStatus, priority, setPriority,
  assignedTo, setAssignedTo, dueDate, setDueDate,
  canManage, canMoveTask, members, currentUserId,
  formError, busy, isDarkMode, textTitle, inputClass, labelClass,
  onSubmit, onClose, onDelete,
}: TaskModalProps) {
  const canMove = editTask && canMoveTask ? canMoveTask(editTask) : true;
  const canDelete = editTask
    ? editTask.created_by === currentUserId || canManage
    : false;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border transition-all duration-300 ${isDarkMode ? "bg-[#17181c] border-[#2f3336]" : "bg-white border-slate-200"}`}>
        <div className={`px-5 py-4 border-b flex items-center justify-between ${isDarkMode ? "border-[#2f3336] bg-[#17181c]/60" : "border-slate-100 bg-slate-50"}`}>
          <h3 className={`font-bold text-lg ${textTitle}`}>{mode === "create" ? "Create Task" : "Edit Task"}</h3>
          <button onClick={onClose} className={isDarkMode ? "text-[#71767b] hover:text-[#e7e9ea]" : "text-slate-500 hover:text-slate-700"}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {formError && (
            <div className="p-3 text-xs rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-medium flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {formError}
            </div>
          )}

          {/* Title */}
          <div>
            <label className={labelClass}>Title *</label>
            <input
              type="text"
              placeholder="Task title..."
              maxLength={150}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              placeholder="Describe details, references, or instructions..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputClass} min-h-[80px] resize-y`}
              maxLength={1000}
            />
          </div>

          {/* Priority + Status row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Priority</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputClass}>
                <option value="high">🔴 High</option>
                <option value="medium">🟡 Medium</option>
                <option value="low">🟢 Low</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-bold ${isDarkMode ? "text-[#8b98a5]" : "text-slate-600"}`}>Status</label>
                {mode === "edit" && !canMove && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500">
                    <Lock className="w-2.5 h-2.5" /> Locked
                  </span>
                )}
              </div>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputClass}
                disabled={mode === "edit" && !canMove}
                title={mode === "edit" && !canMove ? "Only the assignee or owner/admin can change the status" : undefined}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
              {mode === "edit" && !canMove && (
                <p className="text-[10px] text-amber-500/80 mt-1 font-semibold">Only the assignee can move this task.</p>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className={labelClass}>Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Assignee */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-bold ${isDarkMode ? "text-[#8b98a5]" : "text-slate-600"}`}>Assignee</label>
              {!canManage && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-500">
                  <Shield className="w-2.5 h-2.5" /> Owner/Admin only
                </span>
              )}
            </div>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className={inputClass}
              disabled={!canManage}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.name || "Member"}
                </option>
              ))}
            </select>
            {canManage && assignedTo && assignedTo !== currentUserId && (
              <p className="text-[10px] text-[#1e9df1]/80 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" /> Assigned member will receive a push notification.
              </p>
            )}
          </div>

          {/* Footer actions */}
          <div className={`pt-4 border-t flex items-center justify-between ${isDarkMode ? "border-[#2f3336]" : "border-slate-100"}`}>
            {mode === "edit" && onDelete && canDelete ? (
              <button
                type="button"
                onClick={() => editTask && onDelete(editTask.id)}
                className="px-3.5 py-2 rounded-xl text-red-500 bg-red-500/10 hover:bg-red-500/20 text-xs font-bold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-xl text-sm font-medium ${isDarkMode ? "bg-[#16181c] text-[#8b98a5] hover:bg-[#2f3336]" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2 rounded-xl bg-[#1e9df1] hover:bg-[#1677cc] text-[#e7e9ea] text-sm font-semibold disabled:opacity-60 flex items-center gap-1.5 shadow-md"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                {mode === "create" ? "Create Task" : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── TASK COLUMN ───────────────────────────────────────────────────────────────

interface ColumnProps {
  title: string;
  status: "todo" | "in_progress" | "done";
  count: number;
  tasks: TeamTask[];
  isDarkMode: boolean;
  bgCard: string;
  textTitle: string;
  textSub: string;
  currentUserId: string;
  canManage: boolean;
  canMoveTask: (task: TeamTask) => boolean;
  onEdit: (task: TeamTask) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onUpdateStatus: (taskId: string, newStatus: "todo" | "in_progress" | "done") => void;
  dragOver: boolean;
  setDragOver: (active: boolean) => void;
  dotAccent: string;
  draggingTaskId: string | null;
  setDraggingTaskId: (id: string | null) => void;
  filtersActive: boolean;
}

function TaskColumn({
  title, status, count, tasks, isDarkMode, textTitle, textSub,
  currentUserId, canManage, canMoveTask, onEdit, onDelete, onAdd,
  onUpdateStatus, dragOver, setDragOver, dotAccent,
  draggingTaskId, setDraggingTaskId, filtersActive,
}: ColumnProps) {
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDragEnter = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = () => setDragOver(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId) onUpdateStatus(taskId, status);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl flex flex-col min-h-[280px] max-h-[70vh] transition-all duration-200 ${
        isDarkMode ? "bg-[#17181c]/50" : "bg-slate-50"
      } ${
        dragOver
          ? "ring-2 ring-[#1e9df1]/60 ring-dashed bg-[#1e9df1]/5"
          : `border ${isDarkMode ? "border-[#2f3336]/60" : "border-slate-200/80"}`
      }`}
    >
      <div className="px-3.5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dotAccent}`} />
          <span className={`font-bold text-sm ${textTitle}`}>{title}</span>
          <span className={`text-[11px] px-1.5 py-0.5 rounded-md font-bold ${isDarkMode ? "bg-[#16181c] text-[#71767b]" : "bg-slate-200/70 text-slate-600"}`}>
            {count}
          </span>
        </div>
        <button
          onClick={onAdd}
          className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? "hover:bg-[#16181c] text-[#71767b] hover:text-[#e7e9ea]" : "hover:bg-slate-200 text-slate-500 hover:text-slate-800"}`}
          title={`Add task to ${title}`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 pb-2.5 space-y-2.5">
        {tasks.length === 0 ? (
          filtersActive ? (
            <div className={`w-full flex flex-col items-center justify-center py-10 text-center ${isDarkMode ? "text-slate-500" : "text-[#71767b]"}`}>
              <Search className="w-5 h-5 mb-1.5 opacity-60" />
              <span className="text-xs font-semibold">No matching tasks</span>
            </div>
          ) : (
            <button
              onClick={onAdd}
              className={`w-full flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed transition-colors ${
                isDarkMode
                  ? "border-[#2f3336] text-slate-500 hover:border-[#2f3336] hover:text-slate-400"
                  : "border-slate-200 text-[#71767b] hover:border-slate-300 hover:text-slate-500"
              }`}
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">Add a task</span>
            </button>
          )
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDarkMode={isDarkMode}
              textTitle={textTitle}
              textSub={textSub}
              currentUserId={currentUserId}
              canManage={canManage}
              canMove={canMoveTask(task)}
              onEdit={onEdit}
              onDelete={onDelete}
              draggingTaskId={draggingTaskId}
              setDraggingTaskId={setDraggingTaskId}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── TASK CARD ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, isDarkMode, textTitle, textSub, currentUserId, canManage, canMove,
  onEdit, onDelete, draggingTaskId, setDraggingTaskId,
}: {
  task: TeamTask;
  isDarkMode: boolean;
  textTitle: string;
  textSub: string;
  currentUserId: string;
  canManage: boolean;
  canMove: boolean;
  onEdit: (task: TeamTask) => void;
  onDelete: (id: string) => void;
  draggingTaskId: string | null;
  setDraggingTaskId: (id: string | null) => void;
}) {
  const isCreator = task.created_by === currentUserId;
  const isDone = task.status === "done";
  const isDragging = draggingTaskId === task.id;

  const handleDragStart = (e: React.DragEvent) => {
    if (!canMove) { e.preventDefault(); return; }
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggingTaskId(task.id);
  };
  const handleDragEnd = () => setDraggingTaskId(null);

  const getDueDateBadge = () => {
    if (!task.due_date) return null;
    const due = new Date(task.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 3600 * 24));
    const dateFormatted = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    if (isDone) return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
        <CheckCircle className="w-3 h-3" /> {dateFormatted}
      </span>
    );
    if (diffDays < 0) return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-red-500/10 text-red-500 font-semibold">
        <AlertCircle className="w-3 h-3" /> Overdue
      </span>
    );
    if (diffDays === 0) return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold">
        <Clock className="w-3 h-3" /> Today
      </span>
    );
    if (diffDays <= 3) return (
      <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-orange-400 font-semibold">
        <Clock className="w-3 h-3" /> {diffDays}d left
      </span>
    );
    return (
      <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg font-medium ${isDarkMode ? "bg-[#16181c] text-[#71767b]" : "bg-slate-100 text-slate-500"}`}>
        <Calendar className="w-3 h-3" /> {dateFormatted}
      </span>
    );
  };

  if (isDragging) {
    return (
      <div
        onDragEnd={handleDragEnd}
        className={`rounded-xl border-2 border-dashed h-24 flex items-center justify-center select-none ${
          isDarkMode ? "border-[#2f3336] bg-[#16181c]/20 text-slate-600" : "border-slate-300 bg-slate-100/60 text-[#71767b]"
        }`}
      >
        <span className="text-xs font-semibold">Moving…</span>
      </div>
    );
  }

  const accent =
    task.status === "todo" ? "bg-slate-400" :
    task.status === "in_progress" ? "bg-[#1e9df1]" : "bg-emerald-500";

  const priorityCfg = PRIORITY_CONFIG[task.priority ?? "medium"];
  const assignee = task.assigned_profile;
  const creatorName = task.creator_profile?.name ?? "Unknown";

  return (
    <div
      draggable={canMove}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onEdit(task)}
      title={`Created by ${creatorName}`}
      className={`group relative rounded-xl border overflow-hidden transition-all duration-200 ${
        canMove ? "cursor-grab active:cursor-grabbing hover:-translate-y-0.5" : "cursor-pointer"
      } ${
        isDarkMode
          ? "bg-[#17181c] border-[#2f3336] hover:border-[#2f3336] hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)]"
          : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
      }`}
    >
      {/* Status accent stripe */}
      <div className={`h-1 w-full ${accent} ${isDone ? "opacity-60" : ""}`} />

      <div className="p-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Priority badge */}
            <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ${priorityCfg.badge}`}>
              {priorityCfg.icon}
              {priorityCfg.label}
            </span>
          </div>
          <div
            className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            {!canMove && (
              <span title="Only the assignee or owner/admin can move this task" className={`p-1 ${isDarkMode ? "text-slate-600" : "text-[#8b98a5]"}`}>
                <Lock className="w-3 h-3" />
              </span>
            )}
            <button
              onClick={() => onEdit(task)}
              className={`p-1 rounded-md transition-colors ${isDarkMode ? "hover:bg-[#16181c] text-[#71767b] hover:text-[#e7e9ea]" : "hover:bg-slate-100 text-slate-500 hover:text-slate-800"}`}
              title="Edit task"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {(isCreator || canManage) && (
              <button
                onClick={() => onDelete(task.id)}
                className="p-1 rounded-md hover:bg-red-500/10 text-[#71767b] hover:text-red-500 transition-colors"
                title="Delete task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Task title */}
        <h4 className={`text-sm font-semibold leading-snug mt-1.5 ${isDone ? "line-through opacity-50" : textTitle}`}>
          {task.title}
        </h4>

        {/* Description */}
        {task.description && (
          <p className={`text-xs mt-1 leading-relaxed line-clamp-2 ${isDarkMode ? "text-[#71767b]" : "text-slate-500"} ${isDone ? "opacity-50" : ""}`}>
            {task.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="min-w-0">{getDueDateBadge()}</div>
          {assignee ? (
            <div className="flex items-center gap-1.5 min-w-0" title={`Assigned to ${assignee.name}`}>
              <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-[#1e9df1] flex items-center justify-center text-[10px] font-bold text-[#e7e9ea] ring-2 ring-white dark:ring-slate-900">
                {assignee.avatar_url || assignee.profile_pic ? (
                  <img src={assignee.avatar_url || assignee.profile_pic!} alt="" className="w-full h-full object-cover" />
                ) : (
                  assignee.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className={`text-[11px] font-medium truncate max-w-[80px] ${textSub}`}>
                {assignee.name.split(" ")[0]}
              </span>
            </div>
          ) : (
            <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg ${isDarkMode ? "bg-[#16181c]/60 text-slate-500" : "bg-slate-100 text-[#71767b]"}`}>
              Unassigned
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

