/**
 * Audio Energy Analysis — detects hype moments from video audio.
 * Uses Web Audio API to analyze volume, frequency, and energy patterns.
 */

export interface AudioEnergySegment {
  startTime: number;
  endTime: number;
  rms: number;           // Root mean square (volume)
  peak: number;          // Peak amplitude
  zeroCrossingRate: number; // How often waveform crosses zero (proxy for pitch/brightness)
  energyScore: number;   // Normalized 0-1 energy score
}

export interface HypeMoment {
  startTime: number;
  endTime: number;
  score: number;         // 0-1 hype intensity
  type: "energy_spike" | "sustained_hype" | "sudden_quiet" | "build_up";
  description: string;
}

/**
 * Analyze audio energy from a video blob.
 * Extracts the audio track and analyzes energy in 1-second windows.
 */
export async function analyzeAudioEnergy(
  videoBlob: Blob
): Promise<AudioEnergySegment[]> {
  const audioContext = new AudioContext();

  try {
    // Decode the video/audio into an AudioBuffer
    const arrayBuffer = await videoBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const channelData = audioBuffer.getChannelData(0); // mono analysis
    const sampleRate = audioBuffer.sampleRate;
    const windowSize = Math.floor(sampleRate); // 1-second windows
    const segments: AudioEnergySegment[] = [];

    for (let i = 0; i < channelData.length; i += windowSize) {
      const end = Math.min(i + windowSize, channelData.length);
      const window = channelData.slice(i, end);

      // RMS (volume)
      let sumSquares = 0;
      let peak = 0;
      let zeroCrossings = 0;

      for (let j = 0; j < window.length; j++) {
        const sample = window[j];
        sumSquares += sample * sample;
        const abs = Math.abs(sample);
        if (abs > peak) peak = abs;
        if (j > 0 && ((window[j - 1] >= 0) !== (sample >= 0))) {
          zeroCrossings++;
        }
      }

      const rms = Math.sqrt(sumSquares / window.length);
      const zeroCrossingRate = zeroCrossings / window.length;
      const startTime = i / sampleRate;
      const endTime = end / sampleRate;

      segments.push({
        startTime,
        endTime,
        rms,
        peak,
        zeroCrossingRate,
        energyScore: 0, // Will be normalized later
      });
    }

    // Normalize energy scores (0-1)
    const maxRms = Math.max(...segments.map((s) => s.rms), 0.001);
    const maxPeak = Math.max(...segments.map((s) => s.peak), 0.001);

    for (const segment of segments) {
      const rmsNorm = segment.rms / maxRms;
      const peakNorm = segment.peak / maxPeak;
      segment.energyScore = Math.min(1, (rmsNorm * 0.6 + peakNorm * 0.4));
    }

    return segments;
  } finally {
    await audioContext.close();
  }
}

/**
 * Find hype moments from audio energy segments.
 * Detects spikes, sustained high energy, build-ups, and contrast moments.
 */
export function detectHypeMoments(
  segments: AudioEnergySegment[],
  options: {
    spikeThreshold?: number;   // How much above average to count as spike
    minHypeDuration?: number;  // Minimum seconds for a hype moment
    mergeWindow?: number;      // Merge hype moments within this many seconds
  } = {}
): HypeMoment[] {
  const {
    spikeThreshold = 1.5,
    minHypeDuration = 3,
    mergeWindow = 5,
  } = options;

  if (segments.length === 0) return [];

  // Calculate rolling average
  const avgWindow = 10; // 10-second rolling average
  const moments: HypeMoment[] = [];

  for (let i = 0; i < segments.length; i++) {
    const start = Math.max(0, i - avgWindow);
    const windowSlice = segments.slice(start, i + 1);
    const avg = windowSlice.reduce((sum, s) => sum + s.energyScore, 0) / windowSlice.length;

    const seg = segments[i];
    const ratio = seg.energyScore / Math.max(avg, 0.01);

    // Detect spike
    if (ratio > spikeThreshold && seg.energyScore > 0.3) {
      moments.push({
        startTime: Math.max(0, seg.startTime - 2),
        endTime: seg.endTime + 2,
        score: Math.min(1, ratio / (spikeThreshold * 2)),
        type: "energy_spike",
        description: "Sudden energy increase",
      });
    }

    // Detect sustained high energy (3+ seconds above average)
    if (i >= minHypeDuration) {
      const recentWindow = segments.slice(i - minHypeDuration + 1, i + 1);
      const allAbove = recentWindow.every((s) => s.energyScore > avg * 1.2);
      const avgRecent = recentWindow.reduce((sum, s) => sum + s.energyScore, 0) / recentWindow.length;

      if (allAbove && avgRecent > 0.4) {
        moments.push({
          startTime: recentWindow[0].startTime,
          endTime: seg.endTime + 2,
          score: Math.min(1, avgRecent),
          type: "sustained_hype",
          description: "Sustained high energy section",
        });
      }
    }

    // Detect build-up (3+ seconds of increasing energy)
    if (i >= 3) {
      const prev3 = segments.slice(i - 3, i);
      const isBuilding = prev3.every((s, idx) =>
        idx === 0 || s.energyScore >= prev3[idx - 1].energyScore * 0.95
      );
      const increase = seg.energyScore - prev3[0].energyScore;

      if (isBuilding && increase > 0.15 && seg.energyScore > 0.35) {
        moments.push({
          startTime: prev3[0].startTime,
          endTime: seg.endTime + 2,
          score: Math.min(1, increase * 3),
          type: "build_up",
          description: "Energy building to a peak",
        });
      }
    }

    // Detect sudden quiet after loud (contrast = dramatic)
    if (i >= 2) {
      const prevAvg = (segments[i - 1].energyScore + segments[i - 2].energyScore) / 2;
      if (prevAvg > 0.5 && seg.energyScore < prevAvg * 0.4) {
        moments.push({
          startTime: Math.max(0, segments[i - 2].startTime - 1),
          endTime: seg.endTime + 3,
          score: Math.min(1, prevAvg - seg.energyScore),
          type: "sudden_quiet",
          description: "Dramatic contrast — loud to quiet",
        });
      }
    }
  }

  // Merge overlapping moments
  return mergeMoments(moments, mergeWindow);
}

/**
 * Merge hype moments that are close together.
 */
function mergeMoments(moments: HypeMoment[], mergeWindow: number): HypeMoment[] {
  if (moments.length === 0) return [];

  // Sort by start time
  const sorted = [...moments].sort((a, b) => a.startTime - b.startTime);
  const merged: HypeMoment[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = sorted[i];

    if (curr.startTime <= prev.endTime + mergeWindow) {
      // Merge
      prev.endTime = Math.max(prev.endTime, curr.endTime);
      prev.score = Math.max(prev.score, curr.score);
      prev.description = prev.description + " + " + curr.description;
    } else {
      merged.push(curr);
    }
  }

  return merged;
}

/**
 * Combine audio hype moments with transcript-based clips.
 * Returns a unified ranked list of the best clip moments.
 */
export function combineSignals(
  audioMoments: HypeMoment[],
  transcriptClips: Array<{
    startTime: number;
    endTime: number;
    score: number;
    label: string;
    reason: string;
  }>,
  options: { audioWeight?: number; transcriptWeight?: number } = {}
): Array<{
  startTime: number;
  endTime: number;
  score: number;
  label: string;
  reason: string;
  signals: string[];
}> {
  const { audioWeight = 0.4, transcriptWeight = 0.6 } = options;

  // Convert audio moments to clip format
  const audioClips = audioMoments.map((m) => ({
    startTime: m.startTime,
    endTime: m.endTime,
    score: m.score,
    label: m.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    reason: m.description,
    signal: "audio" as const,
  }));

  // Convert transcript clips
  const transcriptFormatted = transcriptClips.map((c) => ({
    ...c,
    signal: "transcript" as const,
  }));

  // Find overlapping clips and merge scores
  type CombinedClip = { startTime: number; endTime: number; score: number; label: string; reason: string; signal: "transcript" | "audio"; signals?: string[] };
  const allClips: CombinedClip[] = [...transcriptFormatted];
  const used = new Set<number>();

  for (const audio of audioClips) {
    let bestOverlap = -1;
    let bestOverlapAmount = 0;

    for (let i = 0; i < allClips.length; i++) {
      if (used.has(i)) continue;
      const tc = allClips[i];
      const overlapStart = Math.max(audio.startTime, tc.startTime);
      const overlapEnd = Math.min(audio.endTime, tc.endTime);
      const overlap = Math.max(0, overlapEnd - overlapStart);

      if (overlap > bestOverlapAmount) {
        bestOverlapAmount = overlap;
        bestOverlap = i;
      }
    }

    if (bestOverlap >= 0 && bestOverlapAmount > 2) {
      // Merge with existing clip
      const existing = allClips[bestOverlap];
      existing.score = Math.min(1,
        existing.score * transcriptWeight + audio.score * audioWeight
      );
      existing.label = existing.label + " + " + audio.label;
      existing.reason = existing.reason + " (corroborated by audio energy)";
      existing.signals = ["transcript", "audio"];
      used.add(bestOverlap);
    } else {
      // Pure audio clip
      allClips.push({
        startTime: audio.startTime,
        endTime: audio.endTime,
        score: audio.score * audioWeight,
        label: audio.label,
        reason: audio.reason,
        signal: "audio" as const,
      });
    }
  }

  // Sort by score
  return allClips
    .sort((a, b) => b.score - a.score)
    .map((c) => ({
      startTime: c.startTime,
      endTime: c.endTime,
      score: Math.round(c.score * 100) / 100,
      label: c.label,
      reason: c.reason,
      signals: c.signals || [c.signal],
    }));
}
