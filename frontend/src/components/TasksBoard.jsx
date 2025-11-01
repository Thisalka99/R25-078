import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  createTask,
  deleteTask,
  listTasks,
  renameTask,
  toggleTask,
  getDayplan,
  setDayplan,
  getTasksSummary,
} from "../api";
import loginImg from "./login.png"; // same grayscale background image

export default function TasksBoard() {
  const { token, user, socket } = useAuth();
  const nav = useNavigate();

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");

  const [deadlineISO, setDeadlineISO] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [allComplete, setAllComplete] = useState(false);
  const redirectedRef = useRef(false);

  const loadTasks = async () => setTasks((await listTasks(token)).tasks || []);
  const loadDayplan = async () => setDeadlineISO((await getDayplan(token)).dayplan?.dueAt || "");
  const loadSummary = async () => setAllComplete(!!(await getTasksSummary(token)).allComplete);

  useEffect(() => {
    (async () => {
      try {
        await loadTasks();
        await loadDayplan();
        await loadSummary();
      } catch (e) {
        setErr(e?.message || "Failed to load tasks/dayplan");
      }
    })();
  }, []);

  useEffect(() => {
    if (!socket || !user) return;
    const onCreated = (t) => setTasks((p) => [t, ...p]);
    const onUpdated = (t) => setTasks((p) => p.map((x) => (x.id === t.id ? t : x)));
    const onDeleted = ({ id }) => setTasks((p) => p.filter((x) => x.id !== id));
    const onCleared = () => setTasks([]);
    socket.on("task_created", onCreated);
    socket.on("task_updated", onUpdated);
    socket.on("task_deleted", onDeleted);
    socket.on("tasks_cleared", onCleared);
    return () => {
      socket.off("task_created", onCreated);
      socket.off("task_updated", onUpdated);
      socket.off("task_deleted", onDeleted);
      socket.off("tasks_cleared", onCleared);
    };
  }, [socket, user]);

  useEffect(() => {
    let timer;
    const tick = () => {
      if (!deadlineISO) return setCountdown(0);
      const left = Math.max(0, Math.floor((new Date(deadlineISO) - Date.now()) / 1000));
      setCountdown(left);
      if (left === 0 && !redirectedRef.current) {
        redirectedRef.current = true;
        nav("/game", { replace: true, state: { reason: "time_up" } });
      }
    };
    tick();
    timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [deadlineISO, nav]);

  useEffect(() => {
    if (!deadlineISO || redirectedRef.current) return;
    if (allComplete && Date.now() < new Date(deadlineISO)) {
      redirectedRef.current = true;
      nav("/game", { replace: true, state: { reason: "finished_early" } });
    }
  }, [allComplete, deadlineISO, nav]);

  const onAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTask(token, title.trim());
    setTitle("");
    await loadTasks();
    await loadSummary();
  };
  const onToggle = async (id) => {
    await toggleTask(token, id);
    await loadTasks();
    await loadSummary();
  };
  const onDelete = async (id) => {
    await deleteTask(token, id);
    await loadTasks();
    await loadSummary();
  };
  const onRename = async (id, t) => {
    await renameTask(token, id, t);
    await loadTasks();
  };

  const [picker, setPicker] = useState("");
  useEffect(() => setPicker(deadlineISO ? toLocalDatetimeInput(deadlineISO) : ""), [deadlineISO]);

  const applyDeadline = async () => {
    if (!picker) return;
    await setDayplan(token, new Date(picker).toISOString());
    redirectedRef.current = false;
    await loadDayplan();
  };

  const total = tasks.length;
  const done = tasks.filter((t) => t.isCompleted).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const styles = {
    shell: {
      display: "flex",
      minHeight: "100vh",
      backgroundColor: "#fff",
      fontFamily:
        '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Inter,Helvetica,Arial,"Apple Color Emoji","Segoe UI Emoji"',
      color: "#111827",
    },
    leftPane: { position: "relative", width: "50%", overflow: "hidden" },
    leftImg: {
      position: "absolute",
      inset: 0,
      width: "100%",
      height: "100%",
      objectFit: "cover",
      filter: "grayscale(100%)",
    },
    rightPane: {
      width: "50%",
      padding: "40px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "center",
    },
    card: {
      width: "100%",
      maxWidth: 600,
      backgroundColor: "#fafafa",
      border: "1px solid #e5e7eb",
      borderRadius: 12,
      padding: 24,
      boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    },
    heading: {
      fontSize: 32,
      fontWeight: 700,
      marginBottom: 20,
      textAlign: "center",
    },
    barWrap: { height: 8, background: "#e5e7eb", borderRadius: 8, overflow: "hidden" },
    fill: { height: "100%", background: "#111827", width: `${pct}%`, transition: "width .3s" },
    input: {
      width: "100%",
      height: 42,
      border: "1px solid #E5E7EB",
      borderRadius: 8,
      padding: "0 12px",
      fontSize: 15,
      marginBottom: 8,
    },
    button: {
      backgroundColor: "#000",
      color: "#fff",
      border: "none",
      borderRadius: 8,
      padding: "10px 22px",
      cursor: "pointer",
      fontSize: 15,
      fontWeight: 600,
    },
  };

  return (
    <div style={styles.shell}>
      <div style={styles.leftPane}>
        <img src={loginImg} alt="Office" style={styles.leftImg} />
      </div>
      <div style={styles.rightPane}>
        <div style={styles.card}>
          <h2 style={styles.heading}>Daily Tasks</h2>

          <div style={{ marginBottom: 24 }}>
            <div style={{ color: "#6B7280", marginBottom: 8 }}>
              Completion: {done}/{total} ({pct}%)
            </div>
            <div style={styles.barWrap}>
              <div style={styles.fill} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "#6B7280", marginBottom: 6 }}>Daily deadline</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="datetime-local"
                value={picker}
                onChange={(e) => setPicker(e.target.value)}
                style={styles.input}
              />
              <button onClick={applyDeadline} style={styles.button}>
                Apply
              </button>
            </div>
            <div style={{ color: "#6B7280", marginTop: 6 }}>
              {deadlineISO ? (
                <>
                  Time left: <b>{fmt(countdown)}</b>
                </>
              ) : (
                "No deadline set."
              )}
            </div>
          </div>

          <form onSubmit={onAdd} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a task…"
              style={styles.input}
            />
            <button type="submit" style={styles.button}>
              Add
            </button>
          </form>

          {err && (
            <div
              style={{
                color: "#B91C1C",
                background: "#FEE2E2",
                border: "1px solid #FCA5A5",
                borderRadius: 8,
                padding: "8px 12px",
                marginBottom: 12,
              }}
            >
              Error: {err}
            </div>
          )}

          {!tasks.length ? (
            <div style={{ color: "#6B7280" }}>No tasks yet.</div>
          ) : (
            tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                onToggle={onToggle}
                onDelete={onDelete}
                onRename={onRename}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ task, onToggle, onDelete, onRename }) {
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState(task.title);
  const save = async () => {
    if (txt.trim()) {
      await onRename(task.id, txt.trim());
      setEditing(false);
    }
  };

  return (
    <div
      style={{
        border: "1px solid #E5E7EB",
        borderRadius: 10,
        background: "#fff",
        padding: "10px 14px",
        marginTop: 8,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <input
        type="checkbox"
        checked={task.isCompleted}
        onChange={() => onToggle(task.id)}
        style={{ width: 18, height: 18 }}
      />
      {editing ? (
        <>
          <input
            value={txt}
            onChange={(e) => setTxt(e.target.value)}
            style={{ flex: 1, border: "1px solid #D1D5DB", borderRadius: 6, padding: "4px 8px" }}
          />
          <button onClick={save} type="button" style={{ marginLeft: 6 }}>
            Save
          </button>
          <button onClick={() => setEditing(false)} type="button" style={{ marginLeft: 6 }}>
            Cancel
          </button>
        </>
      ) : (
        <>
          <div
            style={{
              flex: 1,
              textDecoration: task.isCompleted ? "line-through" : "none",
              color: task.isCompleted ? "#9CA3AF" : "#111827",
            }}
          >
            {task.title}
          </div>
          <button onClick={() => setEditing(true)} type="button">
            Rename
          </button>
          <button onClick={() => onDelete(task.id)} type="button" style={{ marginLeft: 6 }}>
            Delete
          </button>
        </>
      )}
    </div>
  );
}

// helper functions
function toLocalDatetimeInput(iso) {
  try {
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}
function fmt(s) {
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(ss)}`;
}
