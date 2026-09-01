import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// ── Transcription via configured provider ───────────────────────────────────

async function transcribeWithGroq(audioBase64: string, apiKey: string): Promise<Array<{ text: string; start: number; end: number }>> {
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

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Groq transcription failed: ${err}`);
  }

  const data = await res.json();
  return (data.segments || []).map((s: any) => ({
    text: s.text,
    start: s.start,
    end: s.end,
  }));
}

async function transcribeWithDeepgram(audioBase64: string, apiKey: string): Promise<Array<{ text: string; start: number; end: number }>> {
  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));

  const res = await fetch(
    "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&paragraphs=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "audio/webm",
      },
      body: audioBytes,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Deepgram transcription failed: ${err}`);
  }

  const data = await res.json();
  const words = data.results?.channels?.[0]?.alternatives?.[0]?.words || [];
  return words.map((w: any) => ({
    text: w.word,
    start: w.start,
    end: w.end,
  }));
}

async function transcribeWithOpenAI(audioBase64: string, apiKey: string): Promise<Array<{ text: string; start: number; end: number }>> {
  const formData = new FormData();
  const audioBytes = Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0));
  const audioBlob = new Blob([audioBytes], { type: "audio/webm" });
  formData.append("file", audioBlob, "audio.webm");
  formData.append("model", "whisper-1");
  formData.append("response_format", "verbose_json");
  formData.append("timestamp_granularities[]", "segment");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI transcription failed: ${err}`);
  }

  const data = await res.json();
  return (data.segments || []).map((s: any) => ({
    text: s.text,
    start: s.start,
    end: s.end,
  }));
}

async function transcribeAudio(
  audioBase64: string,
  provider: string,
  apiKey: string
): Promise<Array<{ text: string; start: number; end: number }>> {
  switch (provider) {
    case "groq":
      return transcribeWithGroq(audioBase64, apiKey);
    case "deepgram":
      return transcribeWithDeepgram(audioBase64, apiKey);
    case "openai":
      return transcribeWithOpenAI(audioBase64, apiKey);
    default:
      throw new Error(`Unsupported transcription provider: ${provider}`);
  }
}

// ── LLM scoring via configured provider ─────────────────────────────────────

function buildScoringPrompt(transcript: string): string {
  return `You are a video clip analyst. Given this transcript from a video, identify the ${Math.min(8, Math.max(4, Math.ceil(transcript.length / 500)))} most clip-worthy moments.

For each moment, return a JSON array with objects containing:
- "start": start time in seconds (number)
- "end": end time in seconds (number)  
- "score": clip potential 0.0-1.0 (number)
- "label": short category like "High Energy", "Funny", "Insight", "Dramatic", "Emotional", "Viral"
- "reason": one sentence explaining why this moment is clip-worthy

Rules:
- Clips should be 15-60 seconds long
- Merge adjacent high-scoring segments into single clips
- Sort by score descending
- Only return the JSON array, no other text

Transcript with timestamps:
${transcript}`;
}

async function scoreWithClaude(transcript: string, apiKey: string): Promise<any[]> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildScoringPrompt(transcript) }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude scoring failed: ${err}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

async function scoreWithOpenAI(transcript: string, apiKey: string): Promise<any[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: buildScoringPrompt(transcript) }],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI scoring failed: ${err}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "{}";
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : parsed.clips || [];
}

async function scoreWithGemini(transcript: string, apiKey: string): Promise<any[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildScoringPrompt(transcript) }] }],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini scoring failed: ${err}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

async function scoreTranscript(
  transcript: string,
  provider: string,
  apiKey: string
): Promise<any[]> {
  switch (provider) {
    case "claude":
      return scoreWithClaude(transcript, apiKey);
    case "openai":
      return scoreWithOpenAI(transcript, apiKey);
    case "gemini":
      return scoreWithGemini(transcript, apiKey);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

// ── Fallback mock data when no APIs configured ──────────────────────────────

function generateMockTranscript(videoId: string): Array<{ text: string; start: number; end: number }> {
  const hash = videoId.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash);
  const templates = [
    ["Alright chat, let's go for another round", "Oh my god, did you see that? That was insane!", "Wait wait wait, I have an idea", "No way, no way that just happened!", "Chat, are you seeing this right now?", "That's the play, that's the winning play right there", "I can't believe we just pulled that off", "Let's go! Let's freaking go!", "Okay okay, focus up, this is the important part", "Haha, chat is going wild right now", "That was the best moment of the entire stream", "GG everyone, that was amazing"],
    ["So the thing people don't realize about this industry is", "I actually have a really interesting story about that", "The key insight here is that most people get this wrong", "Let me tell you what really happened behind the scenes", "That's a great question, and the answer might surprise you", "Here's the thing that nobody talks about", "I learned this the hard way early in my career", "The data actually shows something completely different", "What most people think is actually backwards", "This changed my entire perspective on the topic", "If I could go back and tell myself one thing", "The real secret is simpler than you'd think"],
  ];
  const templateSet = templates[seed % templates.length];
  const segments: Array<{ text: string; start: number; end: number }> = [];
  const totalSegments = 20 + (seed % 21);
  const videoLength = 1800 + (seed % 3600);
  for (let i = 0; i < totalSegments; i++) {
    const start = Math.floor((i / totalSegments) * videoLength);
    const duration = 3 + ((seed + i) % 8);
    segments.push({ text: templateSet[i % templateSet.length], start, end: start + duration });
  }
  return segments;
}

function generateMockClips(transcript: Array<{ text: string; start: number; end: number }>, videoId: string) {
  const hash = videoId.split("").reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash);
  const labels = [
    { label: "High Energy Reaction", reason: "Excited reaction with strong emotional delivery" },
    { label: "Key Insight", reason: "Valuable information that viewers will want to share" },
    { label: "Funny Moment", reason: "Humorous content with natural comedic timing" },
    { label: "Dramatic Peak", reason: "Building tension that reaches a satisfying payoff" },
    { label: "Chat Favorite", reason: "Moment that resonates with the audience" },
    { label: "Viral Potential", reason: "Share-worthy moment with broad appeal" },
  ];
  const clipCount = 4 + (seed % 5);
  const selectedIndices = new Set<number>();
  while (selectedIndices.size < clipCount && selectedIndices.size < transcript.length) {
    selectedIndices.add((seed + selectedIndices.size * 7) % transcript.length);
  }
  const clips: any[] = [];
  let index = 0;
  for (const idx of Array.from(selectedIndices).sort((a, b) => a - b)) {
    const segment = transcript[idx];
    const clipDuration = 15 + ((seed + index) % 45);
    const startTime = Math.max(0, segment.start - 5);
    const score = 0.6 + (((seed + index * 13) % 40) / 100);
    const labelInfo = labels[(seed + index) % labels.length];
    clips.push({ startTime, endTime: Math.max(startTime + clipDuration, segment.start + 30), score: Math.round(score * 100) / 100, label: labelInfo.label, reason: labelInfo.reason });
    index++;
  }
  return clips.sort((a: any, b: any) => b.score - a.score);
}

function extractVideoId(url: string): string {
  const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/, /^([a-zA-Z0-9_-]{11})$/];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 11) || "default";
}

// ── Main processing action ──────────────────────────────────────────────────

export const processVideo = action({
  args: {
    jobId: v.id("jobs"),
    sourceType: v.union(v.literal("upload"), v.literal("youtube")),
    sourceUrl: v.optional(v.string()),
    sourceName: v.string(),
    audioBase64: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; clipCount: number; realPipeline: boolean }> => {
    const videoId: string = args.sourceUrl ? extractVideoId(args.sourceUrl) : "upload";

    const settings: {
      transcriptionProvider?: string;
      transcriptionApiKey?: string;
      llmProvider?: string;
      llmApiKey?: string;
    } = await ctx.runQuery(api.apiSettings.get) as any;
    const hasRealAPIs: boolean = !!(settings?.transcriptionApiKey && settings?.llmApiKey);

    await ctx.runMutation(api.jobs.updateStatus, {
      jobId: args.jobId,
      status: "processing",
      progress: 10,
    });

    let transcript: Array<{ text: string; start: number; end: number }>;
    let clips: any[];

    if (hasRealAPIs && args.audioBase64) {
      // ── REAL PIPELINE ────────────────────────────────────────────────
      console.log(`[Pipeline] Using ${settings.transcriptionProvider} for transcription`);

      await ctx.runMutation(api.jobs.updateStatus, {
        jobId: args.jobId,
        status: "transcribing",
        progress: 25,
      });

      // Step 1: Transcribe with configured provider
      transcript = await transcribeAudio(
        args.audioBase64!,
        settings.transcriptionProvider!,
        settings.transcriptionApiKey!
      );

      console.log(`[Pipeline] Transcription complete: ${transcript.length} segments`);

      await ctx.runMutation(api.jobs.updateStatus, {
        jobId: args.jobId,
        status: "transcribing",
        progress: 55,
      });

      // Step 2: Build transcript text for LLM
      const transcriptText = transcript
        .map((s) => `[${Math.floor(s.start)}s - ${Math.floor(s.end)}s] ${s.text}`)
        .join("\n");

      await ctx.runMutation(api.jobs.updateStatus, {
        jobId: args.jobId,
        status: "analyzing",
        progress: 65,
      });

      console.log(`[Pipeline] Using ${settings.llmProvider} for scoring`);

      // Step 3: Score with configured LLM
      clips = await scoreTranscript(
        transcriptText,
        settings.llmProvider!,
        settings.llmApiKey!
      );

      console.log(`[Pipeline] Scoring complete: ${clips.length} clips found`);
    } else {
      // ── MOCK PIPELINE (no APIs configured) ───────────────────────────
      console.log("[Pipeline] No APIs configured, using mock data");

      await ctx.runMutation(api.jobs.updateStatus, {
        jobId: args.jobId,
        status: "transcribing",
        progress: 35,
      });
      await new Promise((r) => setTimeout(r, 1500));

      transcript = generateMockTranscript(videoId);

      await ctx.runMutation(api.jobs.updateStatus, {
        jobId: args.jobId,
        status: "analyzing",
        progress: 70,
      });
      await new Promise((r) => setTimeout(r, 1000));

      clips = generateMockClips(transcript, videoId);
    }

    // Save clips to database
    await ctx.runMutation(api.jobs.updateStatus, {
      jobId: args.jobId,
      status: "analyzing",
      progress: 85,
    });

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

    return { success: true, clipCount: clips.length, realPipeline: hasRealAPIs };
  },
});
