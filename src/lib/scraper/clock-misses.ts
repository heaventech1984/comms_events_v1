import fs from "node:fs";
import path from "node:path";

/** Pages we already opened that had no clock. Kept beside the database, not in git. */
const FILE = path.join(process.cwd(), "data", "clock-misses.txt");

export function loadClockMisses(): Set<string> {
  try {
    const text = fs.readFileSync(FILE, "utf8");
    return new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    );
  } catch {
    return new Set();
  }
}

export function saveClockMisses(urls: Set<string>): void {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, [...urls].sort().join("\n"));
}
