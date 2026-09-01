import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoaded = false;

/**
 * Initialize ffmpeg.wasm - loads the WASM binary from CDN
 */
export async function initFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegLoaded) {
    return ffmpegInstance;
  }

  const ffmpeg = new FFmpeg();

  ffmpeg.on("log", ({ message }) => {
    console.log("[FFmpeg]", message);
  });

  ffmpeg.on("progress", ({ progress }) => {
    console.log("[FFmpeg] Progress:", Math.round(progress * 100) + "%");
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

/**
 * Format seconds to HH:MM:SS.mmm for ffmpeg
 */
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

/**
 * Trim a video file to a specific time range
 * @param videoBlob - The source video blob
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 * @param outputName - Output filename
 * @returns Blob of the trimmed video
 */
export async function trimVideo(
  videoBlob: Blob,
  startTime: number,
  endTime: number,
  outputName: string = "clip.mp4"
): Promise<Blob> {
  const ffmpeg = await initFFmpeg();

  // Write input file
  const inputData = await fetchFile(videoBlob);
  await ffmpeg.writeFile("input.mp4", inputData);

  // Calculate duration
  const duration = endTime - startTime;
  const start = formatTime(startTime);

  // Run ffmpeg trim command
  // -ss: start time, -t: duration, -c copy: fast copy without re-encoding
  await ffmpeg.exec([
    "-ss", start,
    "-i", "input.mp4",
    "-t", duration.toString(),
    "-c", "copy",
    "-avoid_negative_ts", "make_zero",
    outputName,
  ]);

  // Read output file
  const outputData = await ffmpeg.readFile(outputName);

  // Clean up
  await ffmpeg.deleteFile("input.mp4");
  await ffmpeg.deleteFile(outputName);

  // Convert to Blob - handle FileData type from ffmpeg
  let buffer: ArrayBuffer;
  if (outputData instanceof Uint8Array) {
    buffer = outputData.buffer.slice(
      outputData.byteOffset,
      outputData.byteOffset + outputData.byteLength
    ) as ArrayBuffer;
  } else {
    buffer = new TextEncoder().encode(String(outputData)).buffer as ArrayBuffer;
  }
  const outputBlob = new Blob([buffer], { type: "video/mp4" });

  return outputBlob;
}

/**
 * Download a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Format duration for filename
 */
export function formatClipFilename(
  sourceName: string,
  startTime: number,
  endTime: number,
  label: string
): string {
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30);
  const start = formatTime(startTime).replace(/:/g, "-");
  const end = formatTime(endTime).replace(/:/g, "-");

  return `${sanitize(sourceName)}_${sanitize(label)}_${start}_to_${end}.mp4`;
}
