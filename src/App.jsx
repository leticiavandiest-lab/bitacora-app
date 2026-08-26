
import React, { useEffect, useMemo, useState } from "react";

const FREE_AI_USES = 2;

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

/* ---------- Compás de avance (señal visual de la marca) ---------- */
function Compass({ percent }) {
  const angle = -90 + (percent / 100) * 360;
  const ticks = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        width="180"
        height="180"
        viewBox="0 0 180 180"
        className="drop-shadow-sm"
      >
        <defs>
          <filter id="inkwobble" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" />
          </filter>
        </defs>

        <circle
          cx="90"
          cy="90"
          r="72"
          fill="none"
          stroke="#C9A227"
          strokeWidth="2"
          filter="url(#inkwobble)"
        />
        <circle
          cx="90"
          cy="90"
          r="58"
          fill="none"
          stroke="#C9A227"
          strokeWidth="1"
          opacity="0.5"
          filter="url(#inkwobble)"
        />

        {ticks.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 90 + Math.sin(rad) * 64;
          const y1 = 90 - Math.cos(rad) * 64;
          const x2 = 90 + Math.sin(rad) * 74;
          const y2 = 90 - Math.cos(rad) * 74;
          return (
            <line
              key={deg}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#EDE6D6"
              strokeWidth="2"
              filter="url(#inkwobble)"
            />
          );
        })}

        <g transform={`rotate(${angle} 90 90)`}>
          <line
            x1="90"
            y1="90"
            x2="90"
            y2="30"
            stroke="#EDE6D6"
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#inkwobble)"
          />
          <line
            x1="90"
            y1="90"
            x2="90"
            y2="118"
            stroke="#EDE6D6"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
            filter="url(#inkwobble)"
          />
        </g>

        <circle cx="90" cy="90" r="5" fill="#C9A227" />
      </svg>
      <div className="text-center">
        <p className="font-mono text-2xl text-parchment">{percent}%</p>
        <p className="text-parchment/60 text-xs uppercase tracking-widest">
          rumbo de la semana
        </p>
      </div>
    </div>
  );
}

/* ---------- App principal ---------- */
export default function Bitacora() {
  const [tasks, setTasks] = useState(() => loadJSON("bitacora_tasks", []));
  const [notes, setNotes] = useState(() => loadJSON("bitacora_notes", []));
  const [aiUsesLeft, setAiUsesLeft] = useState(() =>
    loadJSON("bitacora_ai_uses", FREE_AI_USES)
  );
  const [taskInput, setTaskInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [analysis, setAnalysis] = useState(
    () => loadJSON("bitacora_analysis", "") || ""
  );
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => saveJSON("bitacora_tasks", tasks), [tasks]);
  useEffect(() => saveJSON("bitacora_notes", notes), [notes]);
  useEffect(() => saveJSON("bitacora_ai_uses", aiUsesLeft), [aiUsesLeft]);
  useEffect(() => saveJSON("bitacora_analysis", analysis), [analysis]);

  const weekTasks = useMemo(() => {
    const monday = startOfWeek();
    return tasks.filter((t) => new Date(t.createdAt) >= monday);
  }, [tasks]);

  const percent = useMemo(() => {
    if (weekTasks.length === 0) return 0;
    const done = weekTasks.filter((t) => t.done).length;
    return Math.round((done / weekTasks.length) * 100);
  }, [weekTasks]);

  function addTask(e) {
    e.preventDefault();
    const text = taskInput.trim();
    if (!text) return;
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, done: false, createdAt: new Date().toISOString() },
    ]);
    setTaskInput("");
  }

  function toggleTask(id) {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
  }

  function removeTask(id) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function addNote(e) {
    e.preventDefault();
    const text = noteInput.trim();
    if (!text) return;
    setNotes((prev) => [
      { id: crypto.randomUUID(), text, date: new Date().toISOString() },
      ...prev,
    ]);
    setNoteInput("");
  }

  async function runCoaching() {
    if (aiUsesLeft <= 0) return;
    setLoadingAI(true);
    setAiError("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: weekTasks.map((t) => ({ text: t.text, done: t.done })),
          notes: notes.slice(0, 10).map((n) => n.text),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo generar el análisis.");
      setAnalysis(data.analysis);
      setAiUsesLeft((n) => Math.max(0, n - 1));
    } catch (err) {
      setAiError(err.message || "Algo se torció en la travesía. Probá de nuevo.");
    } finally {
      setLoadingAI(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink text-parchment px-5 py-8 sm:px-10">
      <header className="max-w-3xl mx-auto text-center mb-10">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
          Bitácora
        </h1>
        <p className="text-parchment/60 mt-2 font-sans text-sm sm:text-base">
          Tu día a día, registrado como una travesía.
        </p>
      </header>

      <main className="max-w-3xl mx-auto grid gap-8">
        <section className="bg-parchment/5 border border-brass/30 rounded-2xl p-6 flex flex-col items-center">
          <Compass percent={percent} />
        </section>

        <section className="bg-parchment rounded-2xl p-6 text-ink">
          <h2 className="font-display text-2xl mb-4">Bitácora de hoy</h2>
          <form onSubmit={addTask} className="flex gap-2 mb-4">
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Anotá una tarea de la travesía..."
              className="flex-1 rounded-lg border border-ink/20 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brass"
            />
            <button
              type="submit"
              className="rounded-lg bg-ink text-parchment px-4 py-2 font-medium hover:bg-ink/90"
            >
              Anotar
            </button>
          </form>
          <ul className="flex flex-col gap-2">
            {tasks.length === 0 && (
              <li className="text-ink/50 text-sm">
                Todavía no hay tareas. Empezá la travesía anotando la primera.
              </li>
            )}
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 border-b border-ink/10 pb-2"
              >
                <button
                  onClick={() => toggleTask(t.id)}
                  aria-label={t.done ? "Marcar como pendiente" : "Marcar como hecha"}
                  className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                    t.done ? "bg-brass border-brass" : "border-ink/40"
                  }`}
                />
                <span className={`flex-1 ${t.done ? "line-through text-ink/40" : ""}`}>
                  {t.text}
                </span>
                <button
                  onClick={() => removeTask(t.id)}
                  className="text-ink/30 hover:text-ink/70 text-sm"
                  aria-label="Eliminar tarea"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-parchment rounded-2xl p-6 text-ink">
          <h2 className="font-display text-2xl mb-4">Cuaderno de viaje</h2>
          <form onSubmit={addNote} className="flex flex-col gap-2 mb-4">
            <textarea
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              placeholder="¿Qué pasó hoy en la travesía?"
              rows={3}
              className="rounded-lg border border-ink/20 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brass resize-none"
            />
            <button
              type="submit"
              className="self-end rounded-lg bg-ink text-parchment px-4 py-2 font-medium hover:bg-ink/90"
            >
              Guardar entrada
            </button>
          </form>
          <ul className="flex flex-col gap-3">
            {notes.map((n) => (
              <li key={n.id} className="border-l-2 border-brass pl-3">
                <p className="font-mono text-xs text-ink/50">{formatDate(n.date)}</p>
                <p>{n.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-parchment/5 border border-brass/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-2xl">Análisis del navegante</h2>
            <span className="font-mono text-xs text-brass">
              {aiUsesLeft > 0 ? `${aiUsesLeft} gratis restantes` : "límite gratis alcanzado"}
            </span>
          </div>
          <p className="text-parchment/70 text-sm mb-4">
            Un análisis semanal con IA sobre tus tareas y notas, con sugerencias de
            rumbo para la semana que viene.
          </p>

          {aiUsesLeft > 0 ? (
            <button
              onClick={runCoaching}
              disabled={loadingAI}
              className="rounded-lg bg-brass text-ink px-4 py-2 font-medium hover:bg-brass/90 disabled:opacity-60"
            >
              {loadingAI ? "Leyendo la bitácora..." : "Analizar mi semana"}
            </button>
          ) : (
            <div className="rounded-lg border border-brass/50 px-4 py-3 text-sm text-parchment/80">
              Ya usaste tus 2 análisis gratis. La versión premium (próximamente)
              desbloquea análisis ilimitados.
            </div>
          )}

          {aiError && <p className="text-red-300 text-sm mt-3">{aiError}</p>}

          {analysis && (
            <div className="mt-4 rounded-lg bg-parchment text-ink p-4 whitespace-pre-wrap text-sm">
              {analysis}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
