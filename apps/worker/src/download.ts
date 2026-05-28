import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { toYouTubeWatchUrl } from "@recipe-planner/shared";

const execFileAsync = promisify(execFile);

const MAX_DURATION_SEC = parseInt(process.env.MAX_VIDEO_DURATION_SEC ?? "1200", 10);

export async function downloadAudio(url: string): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "recipe-planner-"));
  const outputTemplate = path.join(tmpDir, "audio.%(ext)s");
  const watchUrl = toYouTubeWatchUrl(url);

  const args = [
    "-x",
    "--audio-format",
    "mp3",
    "--audio-quality",
    "5",
    "--no-playlist",
    "--download-sections",
    `*0-${MAX_DURATION_SEC}`,
    "--js-runtimes",
    "node",
    "--extractor-args",
    "youtube:player_client=android,web",
    "-o",
    outputTemplate,
    watchUrl,
  ];

  const cookiesFile = process.env.YT_DLP_COOKIES_FILE?.trim();
  if (cookiesFile) {
    args.splice(0, 0, "--cookies", cookiesFile);
  }

  try {
    await execFileAsync("yt-dlp", args, {
      timeout: 600000,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    throw new Error(
      `Failed to download audio: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  const files = await fs.readdir(tmpDir);
  const audioFile = files.find((f) => f.startsWith("audio."));
  if (!audioFile) {
    await fs.rm(tmpDir, { recursive: true, force: true });
    throw new Error("No audio file produced by yt-dlp");
  }

  return path.join(tmpDir, audioFile);
}

export async function cleanupPath(filePath: string): Promise<void> {
  try {
    const dir = path.dirname(filePath);
    await fs.rm(dir, { recursive: true, force: true });
  } catch {
    // ignore cleanup errors
  }
}
