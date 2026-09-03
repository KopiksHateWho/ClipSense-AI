import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { emailOtp } from "./auth/emailOtp";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub,
    emailOtp,
    Anonymous({
      profile() {
        const suffix = crypto.randomUUID().slice(0, 4).toUpperCase();
        return { isAnonymous: true, name: `Guest ${suffix}` };
      },
    }),
  ],
});