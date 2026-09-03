import { useState } from "react";
import { motion } from "framer-motion";
import {
  Key,
  Mic,
  Brain,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  ExternalLink,
  Shield,
  Lock,
  ArrowUpRight,
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

type TranscriptionProvider = "groq" | "deepgram" | "assemblyai" | "openai";

const TRANSCRIPTION_PROVIDERS: {
  id: TranscriptionProvider;
  name: string;
  description: string;
  url: string;
  pricing: string;
}[] = [
  {
    id: "groq",
    name: "Groq (Whisper)",
    description: "Fastest inference, great accuracy. Free tier available.",
    url: "https://console.groq.com/keys",
    pricing: "~$0.006/min",
  },
  {
    id: "deepgram",
    name: "Deepgram",
    description: "Industry-leading speed and accuracy.",
    url: "https://console.deepgram.com/signup",
    pricing: "~$0.004/min",
  },
  {
    id: "assemblyai",
    name: "AssemblyAI",
    description: "Smart formatting, speaker detection.",
    url: "https://assemblyai.com/app",
    pricing: "~$0.007/min",
  },
  {
    id: "openai",
    name: "OpenAI Whisper",
    description: "Standard Whisper model, reliable.",
    url: "https://platform.openai.com/api-keys",
    pricing: "~$0.006/min",
  },
];

type LLMProvider = "claude" | "openai" | "gemini" | "sambanova";

const LLM_PROVIDERS: {
  id: LLMProvider;
  name: string;
  description: string;
  url: string;
  pricing: string;
  free?: boolean;
}[] = [
  {
    id: "sambanova",
    name: "SambaNova (Llama 3)",
    description: "Free LLM inference, no credit card needed.",
    url: "https://cloud.sambanova.ai/",
    pricing: "FREE",
    free: true,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Free tier generous, good at analysis.",
    url: "https://aistudio.google.com/apikey",
    pricing: "Free tier available",
    free: true,
  },
  {
    id: "claude",
    name: "Claude (Anthropic)",
    description: "Best at understanding context and nuance.",
    url: "https://console.anthropic.com/settings/keys",
    pricing: "~$0.001/video",
  },
  {
    id: "openai",
    name: "OpenAI (GPT-4o-mini)",
    description: "Fast, cheap, widely used.",
    url: "https://platform.openai.com/api-keys",
    pricing: "~$0.0005/video",
  },
];

export default function Settings() {
  const { user } = useAuth(); // ensure auth context is mounted
  const isGuest = !!user?.isAnonymous;
  const navigate = useNavigate();

  const existingSettings = useQuery(api.apiSettings.get);
  const saveSettings = useMutation(api.apiSettings.save);

  const [transcriptionProvider, setTranscriptionProvider] =
    useState<TranscriptionProvider>("groq");
  const [transcriptionApiKey, setTranscriptionApiKey] = useState("");
  const [llmProvider, setLLMProvider] = useState<LLMProvider>("claude");
  const [llmApiKey, setLLmApiKey] = useState("");
  const [showTranscriptionKey, setShowTranscriptionKey] = useState(false);
  const [showLLMKey, setShowLLMKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load existing settings once
  if (existingSettings && !settingsLoaded) {
    setTranscriptionProvider(existingSettings.transcriptionProvider);
    setTranscriptionApiKey(existingSettings.transcriptionApiKey);
    setLLMProvider(existingSettings.llmProvider);
    setLLmApiKey(existingSettings.llmApiKey);
    setSettingsLoaded(true);
  }

  const handleSave = async () => {
    if (!transcriptionApiKey.trim() || !llmApiKey.trim()) return;

    setIsSaving(true);
    try {
      await saveSettings({
        transcriptionProvider,
        transcriptionApiKey: transcriptionApiKey.trim(),
        llmProvider,
        llmApiKey: llmApiKey.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to save settings:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = transcriptionApiKey.trim() && llmApiKey.trim();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-8 py-4 border-b border-border/50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="ClipSense" width={24} height={24} className="rounded-md" />
            <span className="font-semibold text-sm tracking-tight">ClipSense</span>
          </div>
        </div>
        {!isGuest && (
          <button
            onClick={handleSave}
            disabled={!isConfigured || isSaving}
            className="clip-btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="size-4" />
            ) : null}
            {saved ? "Saved!" : "Save Settings"}
          </button>
        )}
      </nav>

      <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
        {/* Back button */}
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="size-4" />
          Back to workspace
        </button>

        {isGuest ? (
          <div className="clip-card p-10 text-center">
            <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="size-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">Sign in to connect your APIs</h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
              Guests can browse ClipSense, but API keys, analysis, and export
              are reserved for signed-in accounts.
            </p>
            <button
              onClick={() => navigate("/auth?returnTo=/settings")}
              className="clip-btn-primary inline-flex items-center gap-2 text-sm"
            >
              Sign in with GitHub
              <ArrowUpRight className="size-4" />
            </button>
            <p className="mt-4 text-xs text-muted-foreground/60">
              Your keys stay private and are never shared.
            </p>
          </div>
        ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Key className="size-4 clip-accent-text" />
            <span className="clip-label">API Configuration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Connect your APIs
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Bring your own API keys — you control the pipeline. We never store
            or share your keys with third parties.
          </p>

          {/* Quick Setup — Free Options */}
          <div className="clip-card p-6 mb-6 border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                <span className="text-lg">⚡</span>
              </div>
              <div>
                <h2 className="text-base font-semibold">Quick Setup (Free)</h2>
                <p className="text-xs text-muted-foreground">
                  Get running in 2 minutes — no credit card needed
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                <div className="size-8 rounded-md bg-orange-500/10 flex items-center justify-center shrink-0">
                  <Mic className="size-4 text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Groq — Free Transcription</p>
                  <p className="text-[11px] text-muted-foreground">14,400 min/month free Whisper</p>
                </div>
                <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
              </a>
              <a
                href="https://cloud.sambanova.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                <div className="size-8 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Brain className="size-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">SambaNova — Free LLM</p>
                  <p className="text-[11px] text-muted-foreground">Free Llama 3 inference, no card</p>
                </div>
                <ExternalLink className="size-3.5 text-muted-foreground group-hover:text-foreground shrink-0" />
              </a>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 text-center">
              Sign up on both, copy your API keys, paste below. Done!
            </p>
          </div>

          {/* Security note */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/10 mb-8">
            <Shield className="size-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Your keys stay private
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                API keys are stored securely in your account and only used when
                you run an analysis. They are never logged or shared.
              </p>
            </div>
          </div>

          {/* Transcription Provider */}
          <div className="clip-card p-6 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Mic className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Transcription Service</h2>
                <p className="text-xs text-muted-foreground">
                  Converts audio to text with timestamps
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {TRANSCRIPTION_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setTranscriptionProvider(p.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    transcriptionProvider === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{p.name}</span>
                    {transcriptionProvider === p.id && (
                      <CheckCircle2 className="size-4 text-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {p.description}
                  </p>
                  <span className="text-[10px] clip-mono text-primary mt-1 inline-block">
                    {p.pricing}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="relative">
                <input
                  type={showTranscriptionKey ? "text" : "password"}
                  value={transcriptionApiKey}
                  onChange={(e) => setTranscriptionApiKey(e.target.value)}
                  placeholder={`Enter your ${TRANSCRIPTION_PROVIDERS.find((p) => p.id === transcriptionProvider)?.name} API key`}
                  className="w-full px-4 py-2.5 pr-20 bg-background border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setShowTranscriptionKey(!showTranscriptionKey)}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showTranscriptionKey ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                  <a
                    href={TRANSCRIPTION_PROVIDERS.find((p) => p.id === transcriptionProvider)?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* LLM Provider */}
          <div className="clip-card p-6 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Brain className="size-5 text-primary" />
              </div>
              <div>
                <h2 className="text-base font-semibold">AI Scoring Service</h2>
                <p className="text-xs text-muted-foreground">
                  Analyzes transcript to find the best moments
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {LLM_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setLLMProvider(p.id)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    llmProvider === p.id
                      ? "border-primary bg-primary/5"
                      : "border-border/50 hover:border-border"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{p.name}</span>
                    {llmProvider === p.id && (
                      <CheckCircle2 className="size-4 text-primary" />
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {p.description}
                  </p>
                  <span className="text-[10px] clip-mono text-primary mt-1 inline-block">
                    {p.pricing}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">API Key</label>
              <div className="relative">
                <input
                  type={showLLMKey ? "text" : "password"}
                  value={llmApiKey}
                  onChange={(e) => setLLmApiKey(e.target.value)}
                  placeholder={`Enter your ${LLM_PROVIDERS.find((p) => p.id === llmProvider)?.name} API key`}
                  className="w-full px-4 py-2.5 pr-20 bg-background border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    onClick={() => setShowLLMKey(!showLLMKey)}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showLLMKey ? (
                      <EyeOff className="size-3.5" />
                    ) : (
                      <Eye className="size-3.5" />
                    )}
                  </button>
                  <a
                    href={LLM_PROVIDERS.find((p) => p.id === llmProvider)?.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Status indicator */}
          <div
            className={`flex items-center gap-3 p-4 rounded-lg border ${
              isConfigured
                ? "bg-green-500/5 border-green-500/20"
                : "bg-secondary/30 border-border/50"
            }`}
          >
            <div
              className={`size-2 rounded-full ${
                isConfigured ? "bg-green-500" : "bg-muted-foreground/50"
              }`}
            />
            <p className="text-sm">
              {isConfigured ? (
                <span className="text-green-400">
                  Pipeline ready — you can now analyze videos
                </span>
              ) : (
                <span className="text-muted-foreground">
                  Configure both services to enable automatic analysis
                </span>
              )}
            </p>
          </div>
        </motion.div>
        )}
      </div>
    </div>
  );
}
