import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Leaf, Mail, Lock, User, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — CarbonLens AI" }] }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);

  useEffect(() => {
    // Check for Google redirect errors or authentication failures
    const params = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const errorDescription =
      params.get("error_description") ||
      hashParams.get("error_description") ||
      params.get("error") ||
      hashParams.get("error");

    if (errorDescription) {
      setError("Google sign-in failed. Please try again.");
      toast.error("Google sign-in failed. Please try again.");
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await signUp(form.email, form.password, form.name);
        toast.success("Account created! Please check your email to verify your account.");
        // Redirect to onboarding
        navigate({ to: "/onboarding" });
      } else {
        await signIn(form.email, form.password);
        toast.success("Logged in successfully!");
        navigate({ to: "/app/dashboard" });
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An authentication error occurred.");
      toast.error(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError("Google sign-in failed. Please try again.");
      toast.error("Google sign-in failed. Please try again.");
    }
  };

  const handleForgotPassword = async () => {
    if (!form.email) {
      toast.error("Please enter your email address first.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await resetPassword(form.email);
      toast.success("Password reset link sent to your email!");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send reset link.");
      toast.error(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,oklch(0.78_0.18_155/0.22),transparent_60%),radial-gradient(ellipse_at_bottom_right,oklch(0.72_0.15_230/0.22),transparent_60%)]" />

      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4 py-10 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-strong w-full max-w-md rounded-3xl p-8"
        >
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl gradient-eco glow-eco">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">
              Carbon<span className="text-gradient-eco">Lens</span>
            </span>
          </Link>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight">
            {showEmailForm
              ? mode === "signin"
                ? "Sign in with Email"
                : "Join the movement"
              : "Welcome to CarbonLens"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {showEmailForm
              ? mode === "signin"
                ? "Enter your email credentials to access your dashboard."
                : "Create an account and get your baseline in 2 minutes."
              : "See Your Impact. Shape Your Future."}
          </p>

          {error && (
            <div className="mt-4 rounded-xl border border-coral/30 bg-coral/5 p-3 text-xs text-coral">
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">
            {!showEmailForm ? (
              <motion.div
                key="social-flows"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="mt-8 space-y-3"
              >
                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10 transition-all hover:scale-[1.01]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  Continue with Google
                </button>

                {/* Continue with Email */}
                <button
                  type="button"
                  onClick={() => setShowEmailForm(true)}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold hover:bg-white/10 transition-all hover:scale-[1.01]"
                >
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  Continue with Email
                </button>

                <div className="pt-2 text-center text-xs text-muted-foreground">
                  Apple Sign-In is coming soon!
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="email-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="mt-6"
              >
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowEmailForm(false);
                    setError("");
                  }}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to options
                </button>

                {/* Tabs */}
                <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
                  {(["signin", "signup"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setMode(m);
                        setError("");
                      }}
                      className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                        mode === m
                          ? "bg-primary/20 text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {m === "signin" ? "Sign in" : "Sign up"}
                    </button>
                  ))}
                </div>

                <form onSubmit={submit} className="mt-4 space-y-3">
                  {mode === "signup" && (
                    <Field
                      icon={User}
                      placeholder="Your name"
                      value={form.name}
                      onChange={(v) => setForm({ ...form, name: v })}
                      required
                    />
                  )}
                  <Field
                    icon={Mail}
                    type="email"
                    placeholder="you@email.com"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                    required
                  />
                  <Field
                    icon={Lock}
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(v) => setForm({ ...form, password: v })}
                    required
                  />

                  {mode === "signin" && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="group mt-2 flex w-full items-center justify-center gap-2 rounded-xl gradient-eco px-4 py-3 text-sm font-medium text-primary-foreground glow-eco transition-transform hover:scale-[1.01] disabled:opacity-50"
                  >
                    {loading ? (
                      "Processing..."
                    ) : (
                      <>
                        {mode === "signin" ? "Sign in" : "Create account"}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <a href="#" className="underline">
              Terms
            </a>{" "}
            &{" "}
            <a href="#" className="underline">
              Privacy Policy
            </a>
            .
          </p>
        </motion.div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  placeholder,
  type = "text",
  value,
  onChange,
  required,
}: {
  icon: React.ElementType;
  placeholder: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border border-white/10 bg-white/5 px-10 py-3 text-sm placeholder:text-muted-foreground focus:border-eco/60 focus:outline-none focus:ring-2 focus:ring-eco/30"
      />
    </div>
  );
}
