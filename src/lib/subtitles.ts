/**
 * Auto-subtitle generation from transcript data.
 * Creates ASS (Advanced SubStation Alpha) format for styled subtitles.
 */

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
}

/**
 * Format seconds to ASS timestamp (H:MM:SS.CC)
 */
function formatASSTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

/**
 * Generate ASS subtitle file content from transcript segments.
 * Includes styled subtitles with word-by-word highlight effect.
 */
export function generateASSSubtitles(
  segments: TranscriptSegment[],
  options: {
    style?: "default" | "karaoke" | "minimal" | "bold";
    fontSize?: number;
    fontName?: string;
    primaryColor?: string;    // &HBBGGRR& format
    outlineColor?: string;
    position?: "bottom" | "top" | "center";
  } = {}
): string {
  const {
    style = "default",
    fontSize = 48,
    fontName = "Arial",
    primaryColor = "&H00FFFFFF&",  // White
    outlineColor = "&H00000000&",  // Black
    position = "bottom",
  } = options;

  const marginV = position === "top" ? 30 : position === "center" ? 0 : 60;
  const alignment = position === "top" ? 8 : position === "center" ? 5 : 2;

  const styleMap: Record<string, string> = {
    default: `Default: ${fontName},${fontSize},-1,2,0,0,0,0,${primaryColor},&H000000FF&,&H00000000&,&H80000000&,1,2,0,2,10,10,${marginV},1`,
    karaoke: `Default: ${fontName},${fontSize},-1,2,0,0,0,0,${primaryColor},&H000000FF&,&H00000000&,&H80000000&,1,2,0,2,10,10,${marginV},1`,
    minimal: `Default: ${fontName},${fontSize},-1,1,0,0,0,0,${primaryColor},&H000000FF&,&H00000000&,&H80000000&,0,1,0,0,10,10,${marginV},1`,
    bold: `Default: ${fontName},${fontSize},-1,3,0,0,0,0,${primaryColor},&H000000FF&,&H00000000&,&H80000000&,1,3,0,2,10,10,${marginV},1`,
  };

  // Build ASS file
  let ass = `[Script Info]
Title: ClipSense Auto-Subtitles
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${styleMap[style] || styleMap.default}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  // Generate dialogue lines
  for (const segment of segments) {
    const start = formatASSTime(segment.start);
    const end = formatASSTime(segment.end);
    const text = segment.text.replace(/\n/g, "\\N");

    if (style === "karaoke") {
      // Karaoke-style: word-by-word highlight
      const words = text.split(" ");
      const wordDuration = (segment.end - segment.start) / words.length;
      let karaokeText = "";
      words.forEach((word, i) => {
        const delay = Math.floor(wordDuration * i * 100);
        karaokeText += `{\\kf${delay}}${word} `;
      });
      ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${karaokeText.trim()}\n`;
    } else {
      ass += `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}\n`;
    }
  }

  return ass;
}

/**
 * Generate SRT subtitle file (simpler format, widely supported).
 */
export function generateSRTSubtitles(segments: TranscriptSegment[]): string {
  let srt = "";

  segments.forEach((segment, index) => {
    const start = formatSRTTime(segment.start);
    const end = formatSRTTime(segment.end);
    const text = segment.text.replace(/\n/g, "\n");

    srt += `${index + 1}\n`;
    srt += `${start} --> ${end}\n`;
    srt += `${text}\n\n`;
  });

  return srt;
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

/**
 * Split text into subtitle-friendly chunks (max ~42 chars per line).
 * Ensures subtitles don't overflow the screen.
 */
export function chunkSubtitleText(
  text: string,
  maxCharsPerLine: number = 42
): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if ((currentLine + " " + word).trim().length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine ? currentLine + " " + word : word;
    }
  }

  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

/**
 * Generate subtitle file for a specific clip (time-shifted to start at 0).
 */
export function generateClipSubtitles(
  fullTranscript: TranscriptSegment[],
  clipStart: number,
  clipEnd: number,
  format: "ass" | "srt" = "ass"
): string {
  // Filter segments within clip range and shift times
  const clipSegments = fullTranscript
    .filter((s) => s.end > clipStart && s.start < clipEnd)
    .map((s) => ({
      text: s.text,
      start: Math.max(0, s.start - clipStart),
      end: Math.min(clipEnd - clipStart, s.end - clipStart),
    }));

  return format === "ass"
    ? generateASSSubtitles(clipSegments)
    : generateSRTSubtitles(clipSegments);
}
