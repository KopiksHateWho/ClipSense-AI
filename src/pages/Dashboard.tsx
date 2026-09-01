import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Youtube,
  Play,
  ChevronRight,
  Sparkles,
  Zap,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  Download,
  Share2,
  X,
  Settings,
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { trimVideo, downloadBlob, formatClipFilename, extractAudio } from "../lib/video-utils";

type JobDoc = {
  _id: Id<"jobs">;
  userId: string;
  sourceType: "upload" | "youtube";
  sourceUrl?: string;
  sourceName: string;
  status: "pending" | "processing" | "transcribing" | "analyzing" | "completed" | "failed";
  progress?: number;
  error?: string;
  duration?: number;
  clipCount?: number;
  exportedCount?: number;
  createdAt: number;
  completedAt?: number;
};

type ClipDoc = {
  _id: Id<"clips">;
  jobId: Id<"jobs">;
  userId: string;
  index: number;
  startTime: number;
  endTime: number;
  score: number;
  label: string;
  reason: string;
  exported: boolean;
  createdAt: number;
};

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(timestamp: number) {
  const d = new Date(timestamp);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; color: string; label: string }> = {
  pending: { icon: Clock, color: "text-muted-foreground", label: "Queued" },
  processing: { icon: Loader2, color: "text-primary", label: "Processing" },
  transcribing: { icon: Loader2, color: "text-primary", label: "Transcribing" },
  analyzing: { icon: Loader2, color: "text-primary", label: "Analyzing" },
  completed: { icon: CheckCircle2, color: "text-green-400", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400", label: "Failed" },
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "We listen for the hook",
    desc: "Energy spikes, emotional turns, and clean setups.",
  },
  {
    step: "02",
    title: "We rank the payoff",
    desc: "Each moment gets a share potential score.",
  },
  {
    step: "03",
    title: "You choose what ships",
    desc: "Preview, select, and export only the winners.",
  },
];

function ClipPreviewModal({
  clip,
  job,
  onClose,
  videoSource,
}: {
  clip: {
    _id: Id<"clips">;
    startTime: number;
    endTime: number;
    score: number;
    label: string;
    reason: string;
    exported: boolean;
  };
  job: {
    sourceName: string;
    sourceUrl?: string;
    duration?: number;
  };
  videoSource: string | null;
  onClose: () => void;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (!videoSource) {
      setExportError("No video source available. Upload a video or provide a URL to export clips.");
      return;
    }

    setIsExporting(true);
    setExportProgress(0);
    setExportError(null);

    try {
      // Fetch the source video
      setExportProgress(10);
      const response = await fetch(videoSource);
      if (!response.ok) throw new Error("Failed to fetch video source");
      const videoBlob = await response.blob();

      setExportProgress(30);

      // Trim the video
      const trimmedBlob = await trimVideo(
        videoBlob,
        clip.startTime,
        clip.endTime,
        "clip.mp4"
      );

      setExportProgress(90);

      // Generate filename
      const filename = formatClipFilename(
        job.sourceName,
        clip.startTime,
        clip.endTime,
        clip.label
      );

      // Download
      downloadBlob(trimmedBlob, filename);

      setExportProgress(100);
    } catch (error) {
      console.error("Export failed:", error);
      setExportError(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  }, [videoSource, clip, job]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="clip-card w-full max-w-2xl p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-video bg-black/50 flex items-center justify-center">
          <div className="text-center">
            <Play className="size-16 text-primary/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Preview: {formatDuration(clip.startTime)} – {formatDuration(clip.endTime)}
            </p>
            {!videoSource && (
              <p className="text-xs text-amber-400/80 mt-2">
                Video source needed for preview and export
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 size-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">{clip.label}</h3>
              <p className="text-sm text-muted-foreground">{clip.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Score</p>
                <p className="text-lg font-bold text-primary">{Math.round(clip.score * 100)}%</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-5">
            <span className="clip-mono bg-secondary/50 px-2 py-1 rounded">
              {formatDuration(clip.startTime)} – {formatDuration(clip.endTime)}
            </span>
            <span>·</span>
            <span>{clip.endTime - clip.startTime}s clip</span>
            <span>·</span>
            <span>From: {job.sourceName}</span>
          </div>

          {/* Export Progress */}
          {isExporting && (
            <div className="mb-4 p-3 rounded-lg bg-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="size-4 text-primary animate-spin" />
                <span className="text-sm text-foreground">Exporting clip...</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${exportProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-right mt-1 clip-mono">
                {exportProgress}%
              </p>
            </div>
          )}

          {/* Export Error */}
          {exportError && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{exportError}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="clip-btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  Export Clip
                </>
              )}
            </button>
            <button className="px-4 py-2.5 rounded-lg border border-border/60 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-2">
              <Share2 className="size-4" />
              Share
            </button>
            {job.sourceUrl && (
              <a
                href={job.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-lg border border-border/60 text-sm font-medium text-foreground hover:bg-secondary/50 transition-colors flex items-center gap-2"
              >
                <ExternalLink className="size-4" />
                Source
              </a>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sourceTab, setSourceTab] = useState<"upload" | "youtube">("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedClip, setSelectedClip] = useState<ClipDoc | null>(null);
  const [selectedJob, setSelectedJob] = useState<JobDoc | null>(null);
  const [uploadedVideo, setUploadedVideo] = useState<{ blob: Blob; url: string; name: string } | null>(null);

  const createJob = useMutation(api.jobs.create);
  const processVideo = useAction(api.processVideo.processVideo);
  const jobs = useQuery(api.jobs.list);
  const apiSettings = useQuery(api.apiSettings.get);

  const selectedJobClips = useQuery(
    api.clips.listByJob,
    selectedJob ? { jobId: selectedJob._id } : "skip"
  );

  const hasAPIs = !!(apiSettings?.transcriptionApiKey && apiSettings?.llmApiKey);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleFileUpload = (file: File) => {
    // Revoke previous URL if exists
    if (uploadedVideo?.url) {
      URL.revokeObjectURL(uploadedVideo.url);
    }
    const url = URL.createObjectURL(file);
    setUploadedVideo({ blob: file, url, name: file.name });
  };

  const extractVideoName = (url: string) => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes("youtube.com")) {
        return urlObj.searchParams.get("v")?.slice(0, 20) || "YouTube Video";
      }
      if (urlObj.hostname.includes("youtu.be")) {
        return urlObj.pathname.slice(1, 21) || "YouTube Video";
      }
    } catch {
      // invalid URL
    }
    return "YouTube Video";
  };

  const handleSubmit = async () => {
    if (sourceTab === "youtube" && !youtubeUrl.trim()) return;
    if (sourceTab === "upload" && !uploadedVideo) return;

    try {
      const sourceName = sourceTab === "youtube"
        ? extractVideoName(youtubeUrl)
        : uploadedVideo?.name || "Uploaded video";

      const jobId = await createJob({
        sourceType: sourceTab,
        sourceUrl: sourceTab === "youtube" ? youtubeUrl : undefined,
        sourceName,
      });

      // Extract audio from uploaded video for real transcription
      let audioBase64: string | undefined;
      if (sourceTab === "upload" && uploadedVideo) {
        try {
          audioBase64 = await extractAudio(uploadedVideo.blob);
        } catch (err) {
          console.error("Audio extraction failed:", err);
        }
      }

      // Fire and forget — processing runs async in the action
      processVideo({
        jobId,
        sourceType: sourceTab,
        sourceUrl: sourceTab === "youtube" ? youtubeUrl : undefined,
        sourceName,
        audioBase64,
      }).catch(console.error);

      setYoutubeUrl("");
    } catch (error) {
      console.error("Error creating job:", error);
    }
  };

  const handleJobClick = (job: JobDoc) => {
    setSelectedJob(job);
  };

  const activeJobs = jobs?.filter((j) => j.status !== "completed" && j.status !== "failed") || [];
  const completedJobs = jobs?.filter((j) => j.status === "completed" || j.status === "failed") || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-8 py-4 border-b border-border/50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="ClipSense" width={24} height={24} className="rounded-md" />
            <span className="font-semibold text-sm tracking-tight">ClipSense</span>
            <span className="text-[10px] clip-mono font-semibold tracking-widest bg-primary/20 text-primary px-1.5 py-0.5 rounded">
              BETA
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1 ml-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground rounded-md bg-secondary/50">
              <Sparkles className="size-3.5" />
              New analysis
            </button>
            <button
              onClick={() => {
                document.getElementById("history-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors"
            >
              <Clock className="size-3.5" />
              History
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs clip-mono text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-md">
            <Zap className="size-3 clip-accent-text" />
            <span className="text-primary font-medium">{completedJobs.length > 0 ? `$${(completedJobs.length * 1.19).toFixed(2)}` : "$0.00"}</span>
            <span>used</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-secondary/50 rounded-md">
            <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-primary">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <span className="hidden sm:inline">{user?.name || "User"}</span>
          </div>
          <button
            onClick={() => navigate("/settings")}
            className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="size-4" />
          </button>
          <button
            onClick={handleSignOut}
            className="p-2 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            title="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-8 lg:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="clip-ready-dot" />
            <span className="clip-label">Creator Workspace</span>
          </div>
          <div className="flex items-end justify-between">
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
              What should we{" "}
              <span className="clip-accent-text">clip?</span>
            </h1>
            <div className="hidden lg:flex items-center gap-2 text-right">
              <span className="text-3xl font-bold text-foreground">{completedJobs.length}</span>
              <span className="clip-label leading-tight text-right">
                ANALYSES
                <br />
                COMPLETED
              </span>
            </div>
          </div>
          <p className="mt-2 text-muted-foreground max-w-lg text-[15px] leading-relaxed">
            Drop in a source and ClipSense will surface the moments with the
            strongest hook, payoff, and share potential.
          </p>
        </motion.div>

        {/* API Key Warning */}
        {!hasAPIs && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3"
          >
            <Settings className="size-5 text-amber-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-300">API keys required</p>
              <p className="text-xs text-muted-foreground mt-1">
                Configure your transcription and LLM API keys in{' '}
                <button onClick={() => navigate("/settings")} className="underline text-amber-300 hover:text-amber-200">
                  Settings
                </button>{' '}
                before analyzing. We support Groq, Deepgram, OpenAI for transcription and Claude, OpenAI, Gemini for scoring.
              </p>
            </div>
          </motion.div>
        )}

        {/* Two Column: Source + How It Works */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">
          {/* Source Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-3 clip-card p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="clip-mono text-xs clip-accent-text font-semibold">01</span>
                <span className="clip-label">/ Source</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="clip-ready-dot" />
                <span className="text-xs text-muted-foreground font-medium">Ready</span>
              </div>
            </div>

            <h2 className="text-lg font-semibold mb-4">Start with a video</h2>

            {/* Tabs */}
            <div className="flex gap-0 mb-5 border-b border-border/50">
              <button
                onClick={() => setSourceTab("upload")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  sourceTab === "upload"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Upload className="size-3.5" />
                Upload file
              </button>
              <button
                onClick={() => setSourceTab("youtube")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  sourceTab === "youtube"
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Youtube className="size-3.5" />
                YouTube link
              </button>
            </div>

            {/* Upload Zone / YouTube Input */}
            {sourceTab === "upload" ? (
              <div
                className={`clip-upload-zone p-8 flex flex-col items-center justify-center text-center transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : ""
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith("video/")) {
                    handleFileUpload(file);
                  }
                }}
                onClick={() => document.getElementById("file-upload-input")?.click()}
              >
                <input
                  id="file-upload-input"
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                {uploadedVideo ? (
                  <>
                    <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
                      <CheckCircle2 className="size-5 text-green-500" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      {uploadedVideo.name}
                    </p>
                    <p className="text-xs text-green-500">
                      Video loaded · Ready to analyze
                    </p>
                  </>
                ) : (
                  <>
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <Upload className="size-5 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Choose a video file
                    </p>
                    <p className="text-xs text-muted-foreground">
                      MP4, MOV, or WebM · up to 2 GB
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && youtubeUrl.trim()) {
                      handleSubmit();
                    }
                  }}
                  className="w-full px-4 py-3 bg-background border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a YouTube video URL to analyze
                </p>
              </div>
            )}

            {/* Info */}
            <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
              <Sparkles className="size-3.5 clip-accent-text" />
              <span>
                <span className="font-medium text-foreground">Transcript + energy signals</span>
                <br />
                Imported sources are analyzed asynchronously.
              </span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!hasAPIs || (sourceTab === "youtube" && !youtubeUrl.trim()) || (sourceTab === "upload" && !uploadedVideo)}
              className="clip-btn-primary w-full mt-5 flex items-center justify-center gap-2 text-[15px] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Find my best moments
              <ChevronRight className="size-4" />
            </button>
          </motion.div>

          {/* How It Works Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-2 clip-card p-6 flex flex-col"
          >
            <span className="clip-label mb-5">How It Works</span>

            <div className="flex-1 space-y-5">
              {HOW_IT_WORKS.map((item) => (
                <div key={item.step} className="flex gap-3">
                  <span className="clip-step-number mt-0.5 shrink-0">
                    {item.step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-0.5">
                      {item.title}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-5 border-t border-border/50">
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "The best clip is already in there.
                <br />
                <span className="font-semibold text-foreground">
                  You just need to find it.
                </span>"
              </p>
            </div>
          </motion.div>
        </div>

        {/* Active Processing Jobs */}
        <AnimatePresence>
          {activeJobs.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="clip-card p-6 mb-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Loader2 className="size-4 text-primary animate-spin" />
                <span className="clip-label">Processing</span>
              </div>
              <div className="space-y-3">
                {activeJobs.map((job) => {
                  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={job._id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-secondary/30"
                    >
                      <StatusIcon className={`size-5 ${statusConfig.color} ${job.status !== "pending" ? "animate-spin" : ""}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {job.sourceName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {statusConfig.label} · {job.sourceType === "youtube" ? "YouTube" : "Upload"}
                        </p>
                      </div>
                      <div className="w-24">
                        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${job.progress || 0}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground text-right mt-1 clip-mono">
                          {job.progress || 0}%
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Section */}
        <motion.div
          id="history-section"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="clip-card p-6"
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="clip-mono text-xs clip-accent-text font-semibold">03</span>
              <span className="clip-label">/ History</span>
            </div>
            <span className="text-xs text-muted-foreground clip-mono">{completedJobs.length} total</span>
          </div>

          <h2 className="text-lg font-semibold mb-4">Recent analyses</h2>

          {completedJobs.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No analyses yet. Paste a YouTube URL above to get started.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {completedJobs.map((job) => {
                const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.pending;
                const StatusIcon = statusConfig.icon;
                return (
                  <div
                    key={job._id}
                    className="clip-history-row cursor-pointer group"
                    onClick={() => handleJobClick(job)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="size-9 rounded-lg bg-secondary/80 flex items-center justify-center shrink-0">
                        {job.sourceType === "youtube" ? (
                          <Youtube className="size-4 text-red-400" />
                        ) : (
                          <Play className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                          {job.sourceType === "youtube" ? "YouTube" : "Upload"} source · {job.sourceName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 clip-mono">
                          {formatDate(job.createdAt)} · {job.duration ? formatDuration(job.duration) : "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {job.clipCount || 0} highlights
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.exportedCount || 0} exported
                        </p>
                      </div>
                      <StatusIcon className={`size-4 ${statusConfig.color}`} />
                      <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Clip Results for Selected Job */}
        <AnimatePresence>
          {selectedJob && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="clip-card p-6 mt-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Analysis Results</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {selectedJob.sourceName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Close
                </button>
              </div>

              {selectedJob.status === "failed" && selectedJob.error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                  <p className="text-sm font-medium text-red-400">Processing failed</p>
                  <p className="text-xs text-muted-foreground mt-1">{selectedJob.error}</p>
                </div>
              )}

              <div className="grid gap-3">
                {selectedJobClips && selectedJobClips.map((clip, idx) => (
                  <motion.div
                    key={clip._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors group"
                    onClick={() => setSelectedClip(clip)}
                  >
                    <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="clip-mono text-sm font-bold text-primary">
                        {idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-foreground">{clip.label}</p>
                        <span className="text-[10px] clip-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          {Math.round(clip.score * 100)}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{clip.reason}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="clip-mono text-xs text-muted-foreground">
                        {formatDuration(clip.startTime)} – {formatDuration(clip.endTime)}
                      </span>
                      <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Clip Preview Modal */}
      <AnimatePresence>
        {selectedClip && selectedJob && (
          <ClipPreviewModal
            clip={selectedClip}
            job={selectedJob}
            videoSource={
              selectedJob.sourceType === "upload" && uploadedVideo
                ? uploadedVideo.url
                : null
            }
            onClose={() => setSelectedClip(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
