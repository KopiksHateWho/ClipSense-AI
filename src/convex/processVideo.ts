import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// ── Types ───────────────────────────────────────────────────────────────────

type GroqSegment = { text: string; start: number; end: number };
type DeepgramWord = { word: string; start: number; end: number };
type WhisperSegment = { text: string; start: number; end: number };
type ClipResult = {
  startTime: number;
  endTime: number;
  score: number;
  label: string;
  reason: string;
};

// ── Transcription ───────────────────────────────────────────────────────────

async function transcribeWithGroq(audioBase64: string, apiKey: string): Promise<GroqSegment[]> {
  const formData = new FormData();
  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const audioBlob = new Blob([audioBytes], { type: "audio/webm" });
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-large-v3");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) throw new Error(`Groq: ${await res.text()}`);
  const data = await res.json();
  return (data.segments || []).map((s: GroqSegment) => ({
    text: s.text, start: s.start, end: s.end,
  }));
}

async function transcribeWithDeepgram(audioBase64: string, apiKey: string): Promise<GroqSegment[]> {
  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&paragraphs=true",
    { method: "POST", headers: { Authorization: `Token ${apiKey}`, "Content-Type": "audio/webm" }, body: audioBytes }
  );
  if (!res.ok) throw new Error(`Deepgram: ${await res.text()}`);
  const data = await res.json();
  const words: DeepgramWord[] = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  return words.map((w) => ({ text: w.word, start: w.start, end: w.end }));
}

async function transcribeWithOpenAI(audioBase64: string, apiKey: string): Promise<GroqSegment[]> {
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
  if (!res.ok) throw new Error(`OpenAI: ${await res.text()}`);
  const data = await res.json();
  return (data.segments || []).map((s: WhisperSegment) => ({
    text: s.text, start: s.start, end: s.end,
  }));
}

async function transcribeAudio(audioBase64: string, provider: string, apiKey: string): Promise<GroqSegment[]> {
  switch (provider) {
    case "groq": return transcribeWithGroq(audioBase64, apiKey);
    case "deepgram": return transcribeWithDeepgram(audioBase64, apiKey);
    case "openai": return transcribeWithOpenAI(audioBase64, apiKey);
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}

// ── LLM Scoring ─────────────────────────────────────────────────────────────

function buildScoringPrompt(transcript: string, audioHints?: string): string {
  return `You are a viral clip analyst for short-form video content. Given this transcript and optional audio energy data, identify the ${Math.min(8, Math.max(4, Math.ceil(transcript.length / 500)))} most clip-worthy moments.

For each moment, return a JSON array with:
- "start": start time in seconds (number)
- "end": end time in seconds (number, should be 15-60 seconds after start)
- "score": clip potential 0.0-1.0 (number)
- "label": category like "High Energy", "Funny", "Insight", "Dramatic", "Emotional", "Viral", "Reaction"
- "reason": one sentence explaining why

Rules:
- Prioritize moments where audio energy spikes correlate with emotional speech
- Merge adjacent high-scoring segments
- Look for: exclamations, laughter, strong opinions, dramatic pauses, buildup + payoff
- Each clip should be self-contained (understandable without context)
- Sort by score descending
- Return ONLY the JSON array

Transcript:
${transcript}
${audioHints ? `\nAudio Energy Data (energy spikes detected):\n${audioHints}` : ""}`;
}

async function scoreWithClaude(transcript: string, audioHints?: string): Promise<ClipResult[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY || "", "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 2048,
      messages: [{ role: "user", content: buildScoringPrompt(transcript, audioHints) }],
    }),
  });
  if (!res.ok) throw new Error(`Claude: ${await res.text()}`);
  const data = await res.json();
  const text = data.content?.[0]?.text || "[]";
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}

async function scoreWithOpenAI(transcript: string, audioHints?: string): Promise<ClipResult[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildScoringPrompt(transcript, audioHints) }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`OpenAI: ${await res.text()}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.clips || [];
}

async function scoreWithGemini(transcript: string, audioHints?: string): Promise<ClipResult[]> {
  const apiKey = process.env.GEMINI_API_KEY || "";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildScoringPrompt(transcript, audioHints) }] }],
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini: ${await res.text()}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const match = text.match(/\[[\s\S]*\]/);
  return match ? JSON.parse(match[0]) : [];
}

async function scoreTranscript(transcript: string, provider: string, apiKey: string, audioHints?: string): Promise<ClipResult[]> {
  switch (provider) {
    case "claude": return scoreWithClaude(transcript, audioHints);
    case "openai": return scoreWithOpenAI(transcript, audioHints);
    case "gemini": return scoreWithGemini(transcript, audioHints);
    default: throw new Error(`Unsupported LLM: ${provider}`);
  }
}

// ── Mock data (fallback) ────────────────────────────────────────────────────

function generateMockData(videoId: string): { transcript: GroqSegment[]; clips: ClipResult[] } {
  const hash = videoId.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash);

  const templates = [
    ["Alright chat, let's go!", "Oh my god, did you see that?!", "No way that just happened!", "Let's go! Let's go!", "That was insane!", "Chat are you seeing this?", "GG everyone!", "Focus up, this is the play!"],
    ["So the thing people don't realize...", "I have a story about that", "The key insight is most people get this wrong", "Let me tell you what really happened", "That's a great question", "Here's the thing nobody talks about"],
  ];
  const tmpl = templates[seed % templates.length];
  const videoLength = 1800 + (seed % 3600);
  const transcript: GroqSegment[] = [];
  for (let i = 0; i < 20 + (seed % 15); i++) {
    const start = Math.floor((i / 25) * videoLength);
    transcript.push({ text: tmpl[i % tmpl.length], start, end: start + 5 });
  }

  const labels = ["High Energy", "Funny", "Insight", "Dramatic", "Viral", "Emotional"];
  const clips: ClipResult[] = [];
  const indices = new Set<number>();
  while (indices.size < 5 && indices.size < transcript.length) {
    indices.add((seed + indices.size * 7) % transcript.length);
  }
  let idx = 0;
  for (const i of Array.from(indices).sort((a, b) => a - b)) {
    const s = transcript[i];
    clips.push({
      startTime: Math.max(0, s.start - 3), endTime: s.start + 30 + (seed + idx) % 30,
      score: 0.7 + ((seed + idx * 11) % 30) / 100,
      label: labels[(seed + idx) % labels.length],
      reason: "AI-detected highlight moment",
    });
    idx++;
  }
  return { transcript, clips: clips.sort((a, b) => b.score - a.score) };
}

function extractVideoId(url: string): string {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m?.[1] || "default";
}

// ── Main Action ─────────────────────────────────────────────────────────────

export const processVideo = action({
  args: {
    jobId: v.id("jobs"),
    sourceType: v.union(v.literal("upload"), v.literal("youtube")),
    sourceUrl: v.optional(v.string()),
    sourceName: v.string(),
    audioBase64: v.optional(v.string()),
    audioEnergyData: v.optional(v.string()), // JSON from client-side analysis
  },
  handler: async (ctx, args): Promise<{ success: boolean; clipCount: number; realPipeline: boolean }> => {
    const videoId = args.sourceUrl ? extractVideoId(args.sourceUrl) : "upload";

    const settings: Record<string, unknown> = await ctx.runQuery(api.apiSettings.get) as Record<string, unknown>;
    const hasRealAPIs = !!(settings?.transcriptionApiKey && settings?.llmApiKey);

    await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "processing", progress: 10 });

    let transcript: GroqSegment[];
    let clips: ClipResult[];
    let realPipeline = false;

    if (hasRealAPIs && args.audioBase64) {
      // ── REAL PIPELINE ────────────────────────────────────────────────
      realPipeline = true;

      // Step 1: Transcribe
      await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "transcribing", progress: 20 });
      transcript = await transcribeAudio(args.audioBase64, settings.transcriptionProvider as string, settings.transcriptionApiKey as string);
      console.log(`[Pipeline] Transcription: ${transcript.length} segments`);

      // Step 2: Build transcript text
      await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "transcribing", progress: 50 });
      const transcriptText = transcript.map((s) => `[${Math.floor(s.start)}s-${Math.floor(s.end)}s] ${s.text}`).join("\n");

      // Step 3: Build audio energy hints
      let audioHints: string | undefined;
      if (args.audioEnergyData) {
        try {
          const energyData = JSON.parse(args.audioEnergyData) as Array<{ startTime: number; endTime: number; score: number; type: string; description: string }>;
          if (energyData.length > 0) {
            audioHints = energyData.map((e) =>
              `[${Math.floor(e.startTime)}s-${Math.floor(e.endTime)}s] ${e.type}: energy=${(e.score * 100).toFixed(0)}% — ${e.description}`
            ).join("\n");
          }
        } catch { /* ignore parse errors */ }
      }

      // Step 4: Score with LLM
      await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "analyzing", progress: 70 });
      clips = await scoreTranscript(transcriptText, settings.llmProvider as string, settings.llmApiKey as string, audioHints);
      console.log(`[Pipeline] Scoring: ${clips.length} clips found`);
    } else {
      // ── MOCK PIPELINE ────────────────────────────────────────────────
      await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "transcribing", progress: 40 });
      await new Promise((r) => setTimeout(r, 1500));

      const mock = generateMockData(videoId);
      transcript = mock.transcript;
      clips = mock.clips;

      await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "analyzing", progress: 75 });
      await new Promise((r) => setTimeout(r, 1000));
    }

    // Save clips
    await ctx.runMutation(api.jobs.updateStatus, { jobId: args.jobId, status: "analyzing", progress: 90 });
    for (let i = 0; i < clips.length; i++) {
      await ctx.runMutation(api.clips.insert, {
        jobId: args.jobId, index: i,
        startTime: clips[i].startTime, endTime: clips[i].endTime,
        score: clips[i].score, label: clips[i].label, reason: clips[i].reason,
      });
    }

    const duration = transcript.length > 0 ? transcript[transcript.length - 1].end : 0;
    await ctx.runMutation(api.jobs.updateStatus, {
      jobId: args.jobId, status: "completed", progress: 100,
      duration, clipCount: clips.length, exportedCount: 0, completedAt: Date.now(),
    });

    return { success: true, clipCount: clips.length, realPipeline };
  },
});
