import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAuth } from "@/hooks/use-auth";
import { useAuthActions } from "@convex-dev/auth/react";
import logo from "@/assets/logo.svg";
import { Loader2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/dashboard",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, user } = useAuth();
  const { signIn, signOut } = useAuthActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isGuest = !!user?.isAnonymous;

  useEffect(() => {
    // Guests are allowed to stay on this page to upgrade to a real account
    if (!authLoading && isAuthenticated && !isGuest) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, isGuest, navigate, redirect]);

  const handleGitHubLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Replace the anonymous session with a real GitHub account
      if (isGuest) {
        await signOut();
      }
      await signIn("github", { redirectTo: redirect });
    } catch (error) {
      console.error("GitHub sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to sign in with GitHub. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (error) {
      console.error("Guest sign-in error:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to continue as guest. Please try again.",
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col clip-gradient-bg">

      
      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center justify-center h-full flex-col">
        <Card className="min-w-[350px] border shadow-md bg-card border-border/60">
              <CardHeader className="text-center">
              <div className="flex justify-center">
                    <img
                      src={logo}
                      alt="ClipSense"
                      width={64}
                      height={64}
                      className="rounded-lg mb-4 mt-4 cursor-pointer"
                      onClick={() => navigate("/")}
                    />
                  </div>
                <CardTitle className="text-xl">Welcome to ClipSense</CardTitle>
                {isGuest && (
                  <p className="mt-3 text-xs text-muted-foreground bg-secondary/50 border border-border/40 rounded-md px-3 py-2">
                    You're browsing as <span className="font-semibold text-foreground">{user?.name}</span>.
                    Sign in with GitHub to unlock analysis and export.
                  </p>
                )}
              </CardHeader>
              <CardContent className="pb-6">
                {error && (
                  <p className="mb-4 text-sm text-red-500 text-center">{error}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGitHubLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  )}
                  Sign in with GitHub
                </Button>

                {!isGuest && (
                  <>
                    <div className="my-4 flex items-center gap-3">
                      <div className="h-px flex-1 bg-border/60" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="h-px flex-1 bg-border/60" />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full text-muted-foreground hover:text-foreground"
                      onClick={handleGuestLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
                        </svg>
                      )}
                      Continue as Guest
                    </Button>
                    <p className="mt-2 text-center text-xs text-muted-foreground">
                      No account needed — try ClipSense instantly
                    </p>
                  </>
                )}
              </CardContent>

          <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-secondary/50 border-t border-border/50 rounded-b-lg">
            Secured by{" "}
            <a
              href="https://freebuff.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-primary transition-colors"
            >
              freebuff.com
            </a>
          </div>
        </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
