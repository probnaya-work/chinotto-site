/**
 * The two behaviours the finalized design specifies, and nothing else:
 *
 *  1. Elapsed time is measured from the real timestamps the record carries,
 *     recomputed once a second. It is not a decorative counter.
 *  2. `continue` appends one moment dated now. The two carried-over moments
 *     never move.
 *
 * Calendar arithmetic below is the handoff's own: years, months and days are
 * counted against the local calendar, the remainder is shown as a clock.
 */

/** 27 mar 2026 · 18:12 — the moment the record was left. */
const FIRST = new Date(2026, 2, 27, 18, 12).getTime();
/** 30 mar 2026 · 13:29 — carried over. */
const SECOND = new Date(2026, 2, 30, 13, 29).getTime();

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
] as const;

const pad = (n: number): string => String(n).padStart(2, "0");

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

/** `27 mar 2026 · 18:12` */
function stamp(t: number): string {
  const d = new Date(t);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Calendar distance between two instants, e.g. `5 months · 2 days · 06:29:11`. */
function gap(from: number, to: number): string {
  if (to <= from) return "00:00:00";

  const a = new Date(from);
  const b = new Date(to);

  let years = b.getFullYear() - a.getFullYear();
  let months = b.getMonth() - a.getMonth();
  let days = b.getDate() - a.getDate();

  const secA = a.getHours() * 3600 + a.getMinutes() * 60 + a.getSeconds();
  const secB = b.getHours() * 3600 + b.getMinutes() * 60 + b.getSeconds();

  if (secB < secA) days--;
  // Day 0 of a month is the last day of the month before it.
  if (days < 0) {
    months--;
    days += new Date(b.getFullYear(), b.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }

  const hms = (secB - secA + 86400) % 86400;
  const clock = `${pad(Math.floor(hms / 3600))}:${pad(Math.floor((hms % 3600) / 60))}:${pad(hms % 60)}`;

  const parts: string[] = [];
  if (years) parts.push(plural(years, "year"));
  if (years || months) parts.push(plural(months, "month"));
  if (years || months || days) parts.push(plural(days, "day"));
  parts.push(clock);

  return parts.join(" · ");
}

/** The fixed distance between the two carried-over moments, e.g. `2 days · 19:17 later`. */
function interval(from: number, to: number): string {
  const a = new Date(from);
  const b = new Date(to);

  let seconds = b.getHours() * 3600 + b.getMinutes() * 60 - (a.getHours() * 3600 + a.getMinutes() * 60);
  let days = Math.round(
    (new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime() -
      new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime()) /
      86400000,
  );
  if (seconds < 0) {
    seconds += 86400;
    days--;
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${plural(days, "day")} · ${pad(hours)}:${pad(minutes)} later`;
}

const moments = document.getElementById("moments");
const intervalEl = document.getElementById("interval");
const elapsedEl = document.getElementById("elapsed");
const continueEl = document.getElementById("continue");
const verbEl = document.getElementById("continue-verb");

/** Moments the visitor added in this browser. The design allows exactly one. */
let added: number[] = [];

function line(now: number): string {
  const left = gap(FIRST, now);
  if (!added.length) return `left ${left} ago. it has not moved.`;
  const last = added[added.length - 1] as number;
  return `left ${left} ago · continued ${gap(last, now)} ago. what was left earlier has not moved.`;
}

function tick(): void {
  if (elapsedEl) elapsedEl.textContent = line(Date.now());
}

function addMoment(t: number): void {
  if (!moments) return;

  const item = document.createElement("li");
  item.className = "moment moment--yours moment--settling";

  const stampRow = document.createElement("p");
  stampRow.className = "stamp";

  const dot = document.createElement("span");
  dot.className = "dot";
  dot.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.textContent = `now · ${stamp(t)} · this browser`;

  stampRow.append(dot, label);

  const text = document.createElement("p");
  text.className = "moment__text";
  text.setAttribute("aria-hidden", "true");
  text.textContent = "▍";

  item.append(stampRow, text);
  moments.append(item);
}

if (intervalEl) intervalEl.textContent = interval(FIRST, SECOND);

// Attached after the interval is written so the first render is not announced.
if (moments) moments.setAttribute("aria-live", "polite");

verbEl?.addEventListener("click", () => {
  if (added.length) return;
  const t = Date.now();
  added = added.concat(t);
  addMoment(t);
  continueEl?.remove();
  tick();
});

tick();
window.setInterval(() => {
  if (document.visibilityState === "visible") tick();
}, 1000);
document.addEventListener("visibilitychange", tick);
