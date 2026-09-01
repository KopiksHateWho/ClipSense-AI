import { useState } from "react";
import { motion } from "framer-motion";
import {
  Upload,
  Youtube,
  Play,
  ChevronRight,
  Sparkles,
  Zap,
  Target,
  CheckCircle2,
  LogOut,
  Clock,
  Activity,
  BarChart3,
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";

const DEMO_HISTORY = [
  { id: 1, name: "Friday Night Stream", source: "YouTube", duration: "42:18", date: "Sep 1", clips: 4, exported: 0 },
  { id: 2, name: "Creator Session Vol. 3", source: "YouTube", duration: "1:15:42", date: "Sep 1", clips: 6, exported: 2 },
  { id: 3, name: "Podcast Episode 12", source: "Upload", duration: "58:03", date: "Aug 30", clips: 5, exported: 1 },
  { id: 4, name: "Speedrun Highlights", source: "YouTube", duration: "2:31:07", date: "Aug 29", clips: 8, exported: 3 },
  { id: 5, name: "Late Night Radio", source: "Upload", duration: "1:04:55", date: "Aug 28", clips: 3, exported: 0 },
];

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

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sourceTab, setSourceTab] = useState<"upload" | "youtube">("upload");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

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
            <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors">
              <Clock className="size-3.5" />
              History
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs clip-mono text-muted-foreground bg-secondary/50 px-3 py-1.5 rounded-md">
            <Zap className="size-3 clip-accent-text" />
            <span className="text-primary font-medium">$1.19</span>
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
              <span className="text-3xl font-bold text-foreground">36</span>
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
                  // Handle file drop
                }}
              >
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Upload className="size-5 text-primary" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Choose a video file
                </p>
                <p className="text-xs text-muted-foreground">
                  MP4, MOV, or WebM · up to 2 GB
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <p className="text-xs text-muted-foreground">
                  Paste a YouTube video or playlist URL
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
            <button className="clip-btn-primary w-full mt-5 flex items-center justify-center gap-2 text-[15px]">
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

        {/* History Section */}
        <motion.div
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
            <span className="text-xs text-muted-foreground clip-mono">36 total</span>
          </div>

          <h2 className="text-lg font-semibold mb-4">Recent analyses</h2>

          <div className="divide-y divide-border/40">
            {DEMO_HISTORY.map((item) => (
              <div key={item.id} className="clip-history-row cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="size-9 rounded-lg bg-secondary/80 flex items-center justify-center shrink-0">
                    {item.source === "YouTube" ? (
                      <Youtube className="size-4 text-red-400" />
                    ) : (
                      <Play className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {item.source} source · {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 clip-mono">
                      {item.date} · {item.duration}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">
                      {item.clips} highlights
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.exported} exported
                    </p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
