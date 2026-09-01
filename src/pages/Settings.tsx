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
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

type TranscriptionProvider = "groq" | "deepgram" | "assemblyai" | "openai";
type LLMProvider = "claude" | "openai" | "gemini";

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

const LLM_PROVIDERS: {
  id: LLMProvider;
  name: string;
  description: string;
  url: string;
  pricing: string;
}[] = [
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
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Free tier generous, good at analysis.",
    url: "https://aistudio.google.com/apikey",
    pricing: "Free tier available",
  },
];

export default function Settings() {
  useAuth(); // ensure auth context is mounted
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

            <div className="grid grid-cols-2 gap-2 mb-4">
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

            <div className="grid grid-cols-3 gap-2 mb-4">
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
      </div>
    </div>
  );
}
