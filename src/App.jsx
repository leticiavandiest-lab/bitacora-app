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
              type

