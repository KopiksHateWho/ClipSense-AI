import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

// Simulated transcript data for different video types
function generateMockTranscript(videoId: string): Array<{ text: string; start: number; end: number }> {
  const hash = videoId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash);

  const templates = [
    [
      "Alright chat, let's go for another round",
      "Oh my god, did you see that? That was insane!",
      "Wait wait wait, I have an idea",
      "No way, no way that just happened!",
      "Chat, are you seeing this right now?",
      "That's the play, that's the winning play right there",
      "I can't believe we just pulled that off",
      "Let's go! Let's freaking go!",
      "Okay okay, focus up, this is the important part",
      "Haha, chat is going wild right now",
      "That was the best moment of the entire stream",
      "GG everyone, that was amazing",
    ],
    [
      "So the thing people don't realize about this industry is",
      "I actually have a really interesting story about that",
      "The key insight here is that most people get this wrong",
      "Let me tell you what really happened behind the scenes",
      "That's a great question, and the answer might surprise you",
      "Here's the thing that nobody talks about",
      "I learned this the hard way early in my career",
      "The data actually shows something completely different",
      "What most people think is actually backwards",
      "This changed my entire perspective on the topic",
      "If I could go back and tell myself one thing",
      "The real secret is simpler than you'd think",
    ],
    [
      "No way, look at this, look at this!",
      "I literally cannot believe what I'm seeing right now",
      "Chat, this is actually insane",
      "Okay this is the craziest thing I've seen all week",
      "My jaw is on the floor right now",
      "That is absolutely legendary",
      "Someone clip that, someone clip that right now!",
      "This is going to be the biggest moment",
      "I'm literally shaking, that was so intense",
      "The crowd is going absolutely crazy",
      "That deserves a standing ovation",
      "We just witnessed history right there",
    ],
  ];

  const templateSet = templates[seed % templates.length];
  const segments: Array<{ text: string; start: number; end: number }> = [];

  const totalSegments = 20 + (seed % 21);
  const videoLength = 1800 + (seed % 3600);

  for (let i = 0; i < totalSegments; i++) {
    const start = Math.floor((i / totalSegments) * videoLength);
    const duration = 3 + (seed + i) % 8;
    const end = start + duration;
    const text = templateSet[i % templateSet.length];
    segments.push({ text, start, end });
  }

  return segments;
}

function generateClips(
  transcript: Array<{ text: string; start: number; end: number }>,
  videoId: string
): Array<{
  startTime: number;
  endTime: number;
  score: number;
  label: string;
  reason: string;
}> {
  const hash = videoId.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0);
  const seed = Math.abs(hash);

  const labels = [
    { label: "High Energy Reaction", reason: "Excited reaction with strong emotional delivery" },
    { label: "Key Insight", reason: "Valuable information that viewers will want to share" },
    { label: "Funny Moment", reason: "Humorous content with natural comedic timing" },
    { label: "Dramatic Peak", reason: "Building tension that reaches a satisfying payoff" },
    { label: "Chat Favorite", reason: "Moment that resonates with the audience" },
    { label: "Viral Potential", reason: "Share-worthy moment with broad appeal" },
    { label: "Emotional Turn", reason: "Genuine emotional reaction that connects with viewers" },
    { label: "Clean Setup & Payoff", reason: "Well-structured moment with clear narrative arc" },
  ];

  const clipCount = 4 + (seed % 5);
  const clips: Array<{
    startTime: number;
    endTime: number;
    score: number;
    label: string;
    reason: string;
  }> = [];

  const selectedIndices = new Set<number>();
  while (selectedIndices.size < clipCount && selectedIndices.size < transcript.length) {
    const idx = (seed + selectedIndices.size * 7) % transcript.length;
    selectedIndices.add(idx);
  }

  let index = 0;
  for (const idx of Array.from(selectedIndices).sort((a, b) => a - b)) {
    const segment = transcript[idx];
    const clipDuration = 15 + (seed + index) % 45;
    const startTime = Math.max(0, segment.start - 5);
    const endTime = Math.max(Math.min(startTime + clipDuration, segment.start + 30), startTime + 15);
    const score = 0.6 + ((seed + index * 13) % 40) / 100;
    const labelInfo = labels[(seed + index) % labels.length];

    clips.push({
      startTime,
      endTime,
      score: Math.round(score * 100) / 100,
      label: labelInfo.label,
      reason: labelInfo.reason,
    });
    index++;
  }

  return clips.sort((a, b) => b.score - a.score);
}

function extractVideoId(url: string): string {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 11) || "default";
}

export const processVideo = action({
  args: {
    jobId: v.id("jobs"),
    sourceType: v.union(v.literal("upload"), v.literal("youtube")),
    sourceUrl: v.optional(v.string()),
    sourceName: v.string(),
  },
  handler: async (ctx, args) => {
    const videoId = args.sourceUrl ? extractVideoId(args.sourceUrl) : "upload";

    await ctx.runMutation(api.jobs.updateStatus, {
      jobId: args.jobId,
      status: "processing",
      progress: 10,
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    await ctx.runMutation(api.jobs.updateStatus, {
      jobId: args.jobId,
      status: "processing",
      progress: 25,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await ctx.runMutation(api.jobs.updateStatus, {
      jobId: args.jobId,
      status: "transcribing",
      progress: 40,
    });
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const transcript = generateMockTranscript(videoId);

    await ctx.runMutation(api.jobs.updateStatus, {
      jobId: args.jobId,
      status: "transcribing",
      progress: 60,
    });
    await new Promise((resolve) => setTimeout(resolve, 1000));

    await ctx.runMutation(api.jobs.updateStatus, {
      jobId: args.jobId,
      status: "analyzing",
      progress: 75,
    });
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const clips = generateClips(transcript, videoId);

    await ctx.runMutation(api.jobs.updateStatus, {
      jobId: args.jobId,
      status: "analyzing",
      progress: 90,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));

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

    const duration = transcript.length > 0
      ? transcript[transcript.length - 1].end
      : 0;

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
  },
});
