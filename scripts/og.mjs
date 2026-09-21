#!/usr/bin/env node
/**
 * Captures public/og-image.png from scripts/og-template.html, which borrows the
 * site stylesheet so the share card cannot drift from the page.
 *
 * Needs the dev server running (`pnpm dev`) and Google Chrome installed.
 * Run: node scripts/og.mjs
 *
 * Chrome writes the screenshot and then does not always exit on macOS, so this
 * waits for the file to settle and kills the process itself.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, copyFileSync, existsSync, statSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.env.OG_URL ?? "http://localhost:5174/scripts/og-template.html";
const DEADLINE_MS = 45_000;

if (!existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME} — set CHROME to override.`);
  process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "chinotto-og-"));
const shot = join(work, "og.png");

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    `--screenshot=${shot}`,
    `--user-data-dir=${join(work, "profile")}`,
    URL,
  ],
  { stdio: "ignore" },
);

const started = Date.now();
let size = 0;

while (Date.now() - started < DEADLINE_MS) {
  await sleep(500);
  if (!existsSync(shot)) continue;
  const next = statSync(shot).size;
  // Two identical readings means the write has finished.
  if (next > 0 && next === size) break;
  size = next;
}

chrome.kill("SIGKILL");

if (!size) {
  console.error(`No screenshot after ${DEADLINE_MS}ms — is the dev server serving ${URL}?`);
  process.exit(1);
}

copyFileSync(shot, join(ROOT, "public", "og-image.png"));
console.log(`public/og-image.png written from ${URL} (${size} bytes)`);
