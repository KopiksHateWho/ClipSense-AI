import { useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  MapPin,
  Globe,
  AtSign,
  MessageSquare,
} from "lucide-react";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const updateProfile = useMutation(api.users.updateProfile);

  const asStr = (val: unknown) => (typeof val === "string" ? val : "");
  const [name, setName] = useState(() => user?.name ?? "");
  const [username, setUsername] = useState(() => asStr((user as Record<string, unknown>)?.username));
  const [bio, setBio] = useState(() => asStr((user as Record<string, unknown>)?.bio));
  const [location, setLocation] = useState(() => asStr((user as Record<string, unknown>)?.location));
  const [website, setWebsite] = useState(() => asStr((user as Record<string, unknown>)?.website));
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        name: name.trim() || undefined,
        username: username.trim() || undefined,
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Failed to update profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const displayName = name || user?.name || "User";
  const displayEmail = user?.email || "";
  const avatarUrl = user?.image || null;

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
          disabled={isSaving}
          className="clip-btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="size-4" />
          ) : null}
          {saved ? "Saved!" : "Save Profile"}
        </button>
      </nav>

      <div className="max-w-2xl mx-auto px-6 lg:px-8 py-8 lg:py-12">
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
            <User className="size-4 clip-accent-text" />
            <span className="clip-label">Profile</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Your Profile
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Manage how others see you on ClipSense.
          </p>

          {/* Avatar & Basic Info */}
          <div className="clip-card p-6 mb-5">
            <div className="flex items-center gap-5 mb-6">
              {/* Avatar */}
              <div className="relative group">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="size-20 rounded-2xl object-cover border-2 border-border/50"
                  />
                ) : (
                  <div className="size-20 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-border/50">
                    <span className="text-3xl font-bold text-primary">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{displayEmail}</p>
                {user?.isAnonymous && (
                  <span className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    Guest Account
                  </span>
                )}
              </div>
            </div>

            {/* Name */}
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <User className="size-3.5 text-muted-foreground" />
                  Display Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your display name"
                  className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <AtSign className="size-3.5 text-muted-foreground" />
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                  placeholder="your_username"
                  className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors font-mono"
                />
                <p className="text-[11px] text-muted-foreground">
                  Letters, numbers, underscores, and hyphens only.
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <MessageSquare className="size-3.5 text-muted-foreground" />
                  Bio
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  rows={3}
                  maxLength={160}
                  className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                />
                <p className="text-[11px] text-muted-foreground text-right">
                  {bio.length}/160
                </p>
              </div>
            </div>
          </div>

          {/* Links & Location */}
          <div className="clip-card p-6 mb-5">
            <h3 className="text-sm font-semibold mb-4">Links & Location</h3>
            <div className="space-y-4">
              {/* Location */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  Location
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="City, Country"
                  className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>

              {/* Website */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="size-3.5 text-muted-foreground" />
                  Website
                </label>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yoursite.com"
                  className="w-full px-4 py-2.5 bg-background border border-border/60 rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="clip-card p-6">
            <h3 className="text-sm font-semibold mb-4">Preview</h3>
            <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 border border-border/30">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-14 rounded-xl object-cover"
                />
              ) : (
                <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-bold text-primary">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">
                  {name || "Your Name"}
                </p>
                {username && (
                  <p className="text-xs text-muted-foreground font-mono">
                    @{username}
                  </p>
                )}
                {bio && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {bio}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {location && (
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="size-3" />
                      {location}
                    </span>
                  )}
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1"
                    >
                      <Globe className="size-3" />
                      {website.replace(/^https?:\/\//, "")}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
