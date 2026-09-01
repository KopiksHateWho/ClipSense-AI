import { motion } from "framer-motion";
import { useNavigate } from "react-router";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen flex flex-col clip-gradient-bg"
    >
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="max-w-5xl mx-auto relative px-4">
          <div className="flex items-center justify-center min-h-[200px]">
            <div className="text-center">
              <h1 className="text-5xl font-bold text-foreground mb-4">404</h1>
              <p className="text-lg text-muted-foreground mb-6">Page Not Found</p>
              <button
                onClick={() => navigate("/")}
                className="clip-btn-primary text-sm"
              >
                Back to home
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
