import { motion } from "framer-motion";
import { Scissors, ArrowUpRight } from "lucide-react";
import logo from "@/assets/logo.svg";
import { useNavigate } from "react-router";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col clip-gradient-bg">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-10 py-5">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="ClipSense" width={28} height={28} className="rounded-md" />
          <span className="text-foreground font-semibold text-[15px] tracking-tight">
            ClipSense
          </span>
        </div>
        <button
          onClick={() => navigate("/auth")}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Sign in
        </button>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col justify-center py-16 px-6 lg:px-10">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="flex items-center gap-2 mb-5"
          >
            <Scissors className="size-4 clip-accent-text" />
            <span className="clip-label clip-accent-text">AI Highlight Detection</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05] text-foreground"
          >
            Find the moment
            <br />
            <span className="clip-accent-text">worth sharing.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed"
          >
            Turn long-form streams and videos into a ranked shortlist of
            clips your audience will actually watch.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-8"
          >
            <button
              onClick={() => navigate("/auth?returnTo=/dashboard")}
              className="clip-btn-primary inline-flex items-center gap-2 text-[15px]"
            >
              Open workspace
              <ArrowUpRight className="size-4" />
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-4 text-xs clip-mono text-muted-foreground/60"
          >
            No account setup needed · private demo session
          </motion.p>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-6 lg:px-10 py-5 border-t border-border/50">
        <span className="clip-mono text-[11px] text-muted-foreground/50 tracking-wider">
          CLIPSENSE / 01
        </span>
        <span className="clip-mono text-[11px] text-muted-foreground/50 tracking-wider">
          BUILT FOR CREATORS
        </span>
      </footer>
    </div>
  );
}
