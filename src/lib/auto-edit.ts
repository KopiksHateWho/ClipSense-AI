/**
 * Auto-editing utilities for creating polished clips.
 * Handles subtitle burn-in, transitions, and final composition.
 */

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { generateASSSubtitles, type TranscriptSegment } from "./subtitles";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

/**
 * Initialize FFmpeg for auto-editing
 */
async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) return ffmpegInstance;

  const ffmpeg = new FFmpeg();
  ffmpeg.on("log", ({ message }) => {
    console.log("[AutoEdit FFmpeg]", message);
  });

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });

  ffmpegInstance = ffmpeg;
  ffmpegLoaded = true;
  return ffmpeg;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export interface EditOptions {
  addSubtitles?: boolean;
  subtitleStyle?: "default" | "karaoke" | "minimal" | "bold";
  addFadeIn?: boolean;
  addFadeOut?: boolean;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  addEndCard?: boolean;
  endCardText?: string;
  transcript?: TranscriptSegment[];
}

/**
 * Auto-edit a clip: trim, add subtitles, transitions, and effects.
 * Returns the final edited video blob.
 */
export async function autoEditClip(
  videoBlob: Blob,
  startTime: number,
  endTime: number,
  options: EditOptions = {}
): Promise<Blob> {
  const {
    addSubtitles = true,
    subtitleStyle = "default",
    addFadeIn = true,
    addFadeOut = true,
    fadeInDuration = 0.3,
    fadeOutDuration = 0.5,
    transcript = [],
  } = options;

  const ffmpeg = await getFFmpeg();
  const duration = endTime - startTime;

  // Write input video
  const inputData = await fetchFile(videoBlob);
  await ffmpeg.writeFile("input.mp4", inputData);

  // Build ffmpeg command
  const filters: string[] = [];
  const inputArgs = ["-ss", formatTime(startTime), "-i", "input.mp4", "-t", duration.toString()];

  // Add fade in/out
  if (addFadeIn) {
    filters.push(`fade=t=in:st=0:d=${fadeInDuration}`);
  }
  if (addFadeOut) {
    filters.push(`fade=t=out:st=${Math.max(0, duration - fadeOutDuration)}:d=${fadeOutDuration}`);
  }

  // Generate and write subtitle file
  if (addSubtitles && transcript.length > 0) {
    const clipTranscript = transcript
      .filter((s) => s.end > startTime && s.start < endTime)
      .map((s) => ({
        text: s.text,
        start: Math.max(0, s.start - startTime),
        end: Math.min(duration, s.end - startTime),
      }));

    if (clipTranscript.length > 0) {
      const assContent = generateASSSubtitles(clipTranscript, {
        style: subtitleStyle,
        position: "bottom",
      });

      await ffmpeg.writeFile("subtitles.ass", assContent);

      // Escape the path for ffmpeg filter
      const subtitleFilter = "subtitles=subtitles.ass:force_style='FontSize=24'";
      filters.push(subtitleFilter);
    }
  }

  // Build final command
  const outputArgs: string[] = [];

  if (filters.length > 0) {
    outputArgs.push("-vf", filters.join(","));
  }

  outputArgs.push("-c:v", "libx264", "-preset", "fast", "-crf", "23");
  outputArgs.push("-c:a", "aac", "-b:a", "128k");
  outputArgs.push("-movflags", "+faststart");
  outputArgs.push("output.mp4");

  // Run ffmpeg
  await ffmpeg.exec([...inputArgs, ...outputArgs]);

  // Read output
  const outputData = await ffmpeg.readFile("output.mp4");

  // Clean up
  await ffmpeg.deleteFile("input.mp4");
  await ffmpeg.deleteFile("output.mp4");
  try { await ffmpeg.deleteFile("subtitles.ass"); } catch { /* ignore */ }

  // Convert to blob
  let buffer: ArrayBuffer;
  if (outputData instanceof Uint8Array) {
    buffer = outputData.buffer.slice(
      outputData.byteOffset,
      outputData.byteOffset + outputData.byteLength
    ) as ArrayBuffer;
  } else {
    buffer = new TextEncoder().encode(String(outputData)).buffer as ArrayBuffer;
  }

  return new Blob([buffer], { type: "video/mp4" });
}

/**
 * Create a compilation of multiple clips with transitions.
 */
export async function createCompilation(
  videoBlob: Blob,
  clips: Array<{
    startTime: number;
    endTime: number;
    label?: string;
  }>,
): Promise<Blob> {
  const ffmpeg = await getFFmpeg();

  // Write input video
  const inputData = await fetchFile(videoBlob);
  await ffmpeg.writeFile("input.mp4", inputData);

  // Trim each clip
  const clipFiles: string[] = [];

  for (let i = 0; i < clips.length; i++) {
    const clip = clips[i];
    const clipFile = `clip_${i}.mp4`;
    const duration = clip.endTime - clip.startTime;

    await ffmpeg.exec([
      "-ss", formatTime(clip.startTime),
      "-i", "input.mp4",
      "-t", duration.toString(),
      "-c:v", "libx264", "-preset", "fast",
      "-c:a", "aac",
      clipFile,
    ]);

    clipFiles.push(clipFile);
  }

  // Create concat list
  const concatList = clipFiles.map((f) => `file '${f}'`).join("\n");
  await ffmpeg.writeFile("concat.txt", concatList);

  // Concatenate clips
  await ffmpeg.exec([
    "-f", "concat", "-safe", "0",
    "-i", "concat.txt",
    "-c", "copy",
    "compilation.mp4",
  ]);

  // Read output
  const outputData = await ffmpeg.readFile("compilation.mp4");

  // Clean up
  await ffmpeg.deleteFile("input.mp4");
  for (const f of clipFiles) {
    try { await ffmpeg.deleteFile(f); } catch { /* ignore */ }
  }
  await ffmpeg.deleteFile("concat.txt");
  await ffmpeg.deleteFile("compilation.mp4");

  // Convert to blob
  let buffer: ArrayBuffer;
  if (outputData instanceof Uint8Array) {
    buffer = outputData.buffer.slice(
      outputData.byteOffset,
      outputData.byteOffset + outputData.byteLength
    ) as ArrayBuffer;
  } else {
    buffer = new TextEncoder().encode(String(outputData)).buffer as ArrayBuffer;
  }

  return new Blob([buffer], { type: "video/mp4" });
}
