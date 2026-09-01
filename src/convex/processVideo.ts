import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

type TranscriptSegment = { text: string; start: number; end: number };
type ClipResult = { startTime: number; endTime: number; score: number; label: string; reason: string };

// ── YouTube Audio Download ──────────────────────────────────────────────────

async function downloadYouTubeAudio(url: string): Promise<string> {
  // Use cobalt.tools API to extract audio from YouTube
  const res = await fetch("https://api.cobalt.tools/", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ url, downloadMode: "audio", audioFormat: "mp3" }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`YouTube download failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  if (data.status === "error" || !data.url) {
    throw new Error(data.error?.code || "YouTube download failed — cobalt returned no URL");
  }
  // Download the actual audio file
  const audioRes = await fetch(data.url);
  if (!audioRes.ok) throw new Error("Failed to download audio from cobalt URL");
  const arrayBuf = await audioRes.arrayBuffer();
  // Convert to base64
  const bytes = new Uint8Array(arrayBuf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// ── Transcription ───────────────────────────────────────────────────────────

async function transcribeWithGroq(audioBase64: string, apiKey: string): Promise<TranscriptSegment[]> {
  const formData = new FormData();
  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  formData.append("file", new Blob([audioBytes], { type: "audio/webm" }), "audio.webm");
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`Groq transcription failed: ${await res.text()}`);
  const data = await res.json();
  return (data.segments || []).map((s: TranscriptSegment) => ({ text: s.text, start: s.start, end: s.end }));
}

async function transcribeWithDeepgram(audioBase64: string, apiKey: string): Promise<TranscriptSegment[]> {
  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const res = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&paragraphs=true", {
    method: "POST",
    headers: { Authorization: `Token ${apiKey}`, "Content-Type": "audio/webm" },
    body: audioBytes,
  });
  if (!res.ok) throw new Error(`Deepgram transcription failed: ${await res.text()}`);
  const data = await res.json();
  const words = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  return words.map((w: { word: string; start: number; end: number }) => ({ text: w.word, start: w.start, end: w.end }));
}

async function transcribeWithOpenAI(audioBase64: string, apiKey: string): Promise<TranscriptSegment[]> {
  const formData = new FormData();
  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  formData.append("file", new Blob([audioBytes], { type: "audio/webm" }), "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");
  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });
  if (!res.ok) throw new Error(`OpenAI transcription failed: ${await res.text()}`);
  const data = await res.json();
  return (data.segments || []).map((s: TranscriptSegment) => ({ text: s.text, start: s.start, end: s.end }));
}

async function transcribeAudio(audioBase64: string, provider: string, apiKey: string): Promise<TranscriptSegment[]> {
  switch (provider) {
    case "groq": return transcribeWithGroq(audioBase64, apiKey);
    case "deepgram": return transcribeWithDeepgram(audioBase64, apiKey);
    case "openai": return transcribeWithOpenAI(audioBase64, apiKey);
    default: throw new Error(`Unsupported transcription provider: ${provider}`);
  }
}

// ── LLM Scoring (all use user's API key, NOT process.env) ──────────────────

function buildScoringPrompt(transcript: string, audioHints?: string): string {
  return `You are a viral clip analyst for short-form video content. Given this transcript and optional audio energy data, identify the ${Math.min(8, Math.max(4, Math.ceil(transcript.length / 500)))} most clip-worthy moments.

For each moment, return a JSON array with:
- "start": start time in seconds (number)
- "end": end time in seconds (number, 15-60s after start)
- "score": clip potential 0.0-1.0 (number)
- "label": category like "High Energy", "Funny", "Insight", "Dramatic", "Emotional", "Viral", "Reaction"
- "reason": one sentence explaining why

Rules:
- Look for exclamations, laughter, strong opinions, dramatic pauses, buildup + payoff
- Each clip should be self-contained
- Sort by score descending
- Return ONLY the JSON array

Transcript:\n${transcript}\n${audioHints ? `\nAudio Energy Data:\n${audioHints}` : ""}`;
}

async function scoreWithClaude(transcript: string, apiKey: string, audioHints?: string): Promise<ClipResult[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildScoringPrompt(transcript, audioHints) }],
    }),
  });
  if (!res.ok) throw new Error(`Claude scoring failed: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || "[]";
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}

async function scoreWithOpenAI(transcript: string, apiKey: string, audioHints?: string): Promise<ClipResult[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildScoringPrompt(transcript, audioHints) }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI scoring failed: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.clips || [];
}

async function scoreWithGemini(transcript: string, apiKey: string, audioHints?: string): Promise<ClipResult[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildScoringPrompt(transcript, audioHints) }] }] }),
    },
  );
  if (!res.ok) throw new Error(`Gemini scoring failed: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}

async function scoreWithSambaNova(transcript: string, apiKey: string, audioHints?: string): Promise<ClipResult[]> {
  const res = await fetch("https://api.sambanova.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "Meta-Llama-3.1-8B-Instruct",
      messages: [{ role: "user", content: buildScoringPrompt(transcript, audioHints) }],
      temperature: 0.3,
    }),
  });
  if (!res.ok) throw new Error(`SambaNova scoring failed: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "[]";
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}

async function scoreTranscript(transcript: string, provider: string, apiKey: string, audioHints?: string): Promise<ClipResult[]> {
  switch (provider) {
    case "claude": return scoreWithClaude(transcript, apiKey, audioHints);
    case "openai": return scoreWithOpenAI(transcript, apiKey, audioHints);
    case "gemini": return scoreWithGemini(transcript, apiKey, audioHints);
    case "sambanova": return scoreWithSambaNova(transcript, apiKey, audioHints);
    default: throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

// ── Main Action ─────────────────────────────────────────────────────────────

export const processVideo = action({
  args: {
    jobId: v.id("jobs"),
    sourceType: v.union(v.literal("upload"), v.literal("youtube")),
    sourceUrl: v.optional(v.string()),
    sourceName: v.string(),
    audioBase64: v.optional(v.string()),
    audioEnergyData: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; clipCount: number }> => {
    // Fetch user's API settings
    let settings: Record<string, unknown> = {};
    try {
      settings = (await ctx.runQuery(api.apiSettings.get)) as Record<string, unknown> || {};
    } catch (e) {
      console.log("[Pipeline] Could not fetch API settings:", e);
    }

    const hasTranscriptionKey = !!settings?.transcriptionApiKey;
    const hasLLMKey = !!settings?.llmApiKey;

    if (!hasTranscriptionKey || !hasLLMKey) {
      const missing = !hasTranscriptionKey && !hasLLMKey
        ? "transcription AND LLM API keys"
        : !hasTranscriptionKey
          ? "transcription API key"
          : "LLM API key";
      await ctx.runMutation(api.jobs.updateStatus, {
        jobId: args.jobId,
        status: "failed",
        progress: 0,
        error: `Missing ${missing}. Go to Settings (⚙️) and configure your API providers first.`,
      });
      return { success: false, clipCount: 0 };
    }

    const transcriptionProvider = settings.transcriptionProvider as string;
    const transcriptionApiKey = settings.transcriptionApiKey as string;
    const llmProvider = settings.llmProvider as string;
    const llmApiKey = settings.llmApiKey as string;

    await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "processing", progress: 5 });

    let transcript: TranscriptSegment[];
    let clips: ClipResult[];

    try {
      // ── Step 1: Get audio ──
      let audioBase64 = args.audioBase64;

      if (!audioBase64 && args.sourceType === "youtube" && args.sourceUrl) {
        // Download audio from YouTube via cobalt.tools
        await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "processing", progress: 10 });
        console.log("[Pipeline] Downloading YouTube audio...");
        audioBase64 = await downloadYouTubeAudio(args.sourceUrl);
        console.log(`[Pipeline] YouTube audio downloaded (${Math.round(audioBase64.length / 1024)}KB base64)`);
      }

      if (!audioBase64) {
        throw new Error("No audio data available. Please upload a video file or provide a valid YouTube URL.");
      }

      // ── Step 2: Transcribe ──
      await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "transcribing", progress: 20 });
      console.log(`[Pipeline] Transcribing with ${transcriptionProvider}...`);
      transcript = await transcribeAudio(audioBase64, transcriptionProvider, transcriptionApiKey);
      console.log(`[Pipeline] Transcription complete: ${transcript.length} segments`);

      if (transcript.length === 0) {
        throw new Error("Transcription returned no segments. The audio may be silent or in an unsupported format.");
      }

      // ── Step 3: Score ──
      await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "transcribing", progress: 50 });
      const transcriptText = transcript
        .map((s) => `[${Math.floor(s.start)}s-${Math.floor(s.end)}s] ${s.text}`)
        .join("\n");

      // Build audio energy hints if available
      let audioHints: string | undefined;
      if (args.audioEnergyData) {
        try {
          const energyData = JSON.parse(args.audioEnergyData) as Array<{
            startTime: number; endTime: number; score: number; type: string; description: string;
          }>;
          if (energyData.length > 0) {
            audioHints = energyData
              .map((e) => `[${Math.floor(e.startTime)}s-${Math.floor(e.endTime)}s] ${e.type}: energy=${(e.score * 100).toFixed(0)}%`)
              .join("\n");
          }
        } catch { /* ignore parse errors */ }
      }

      await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "analyzing", progress: 70 });
      console.log(`[Pipeline] Scoring with ${llmProvider}...`);
      clips = await scoreTranscript(transcriptText, llmProvider, llmApiKey, audioHints);
      console.log(`[Pipeline] Scoring complete: ${clips.length} clips found`);

      if (clips.length === 0) {
        throw new Error("AI scoring returned no clips. The transcript may be too short or the video content may not have identifiable highlight moments.");
      }

      // ── Step 4: Save clips ──
      await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "analyzing", progress: 85 });
      for (let i = 0; i < clips.length; i++) {
        await ctx.runMutation(api.clips.insert, {
          jobId: args.jobId,
          index: i,
          startTime: clips[i].startTime,
          endTime: clips[i].endTime,
          score: clips[i].score,
          label: clips[i].label,
          reason: clips[i].reason,
        });
      }

      const duration = transcript.length > 0 ? transcript[transcript.length - 1].end : 0;
      await ctx.runMutation(api.jobs.updateStatus, {
        jobId: args.jobId,
        status: "completed",
        progress: 100,
        duration,
        clipCount: clips.length,
        exportedCount: 0,
        completedAt: Date.now(),
      });

      return { success: true, clipCount: clips.length };
    } catch (error) {
      console.error("[Pipeline] Error:", error);
      await ctx.runMutation(api.jobs.updateStatus, {
        jobId: args.jobId,
        status: "failed",
        progress: 0,
        error: error instanceof Error ? error.message : "Unknown error during processing",
      });
      return { success: false, clipCount: 0 };
    }
  },
});
