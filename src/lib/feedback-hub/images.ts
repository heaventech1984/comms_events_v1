import { mkdir, writeFile } from "fs/promises";
import path from "node:path";

const MAX_BYTES = 512_000;
const FEEDBACK_DIR = path.join(process.cwd(), "data", "feedback");

export async function saveFeedbackImage(
  submissionId: string,
  bytes: Buffer,
  mime: string
): Promise<{ relativePath: string; mime: string }> {
  if (bytes.length > MAX_BYTES) throw new Error("Image must be 500KB or smaller.");
  if (mime !== "image/jpeg" && mime !== "image/png") throw new Error("Use JPEG or PNG only.");
  await mkdir(FEEDBACK_DIR, { recursive: true });
  const ext = mime === "image/png" ? "png" : "jpg";
  const file = `${submissionId}.${ext}`;
  const full = path.join(FEEDBACK_DIR, file);
  await writeFile(full, bytes);
  return { relativePath: `feedback/${file}`, mime };
}

export function feedbackImageFullPath(relativePath: string): string {
  const base = path.join(process.cwd(), "data");
  const resolved = path.resolve(base, relativePath);
  if (!resolved.startsWith(path.resolve(base))) throw new Error("Invalid image path.");
  return resolved;
}
