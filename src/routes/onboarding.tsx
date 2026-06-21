import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Leaf, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/lib/supabase";
import { calculateFootprint, calculateSustainabilityScore } from "@/services/carbon-engine";
import { awardAchievement } from "@/services/user-service";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Onboarding — CarbonLens AI" }] }),
  component: Onboarding,
});

type Step = {
  key: string;
  title: string;
  subtitle: string;
  options: { label: string; value: string | number; icon: string }[];
};

const steps: Step[] = [
  {
    key: "transport",
    title: "How do you usually commute?",
    subtitle: "Your main mode of getting around on weekdays.",
    options: [
      { label: "Car (solo)", value: "Car (solo)", icon: "🚗" },
      { label: "Carpool / rideshare", value: "Carpool / rideshare", icon: "🚙" },
      { label: "Public transit", value: "Public transit", icon: "🚆" },
      { label: "Bike or walk", value: "Bike or walk", icon: "🚴" },
    ],
  },
  {
    key: "distance",
    title: "Weekly travel distance?",
    subtitle: "Approximate total km per week including all trips.",
    options: [
      { label: "Under 50 km", value: 25, icon: "🏘️" },
      { label: "50 – 150 km", value: 75, icon: "🛣️" },
      { label: "150 – 400 km", value: 150, icon: "🚙" },
      { label: "Over 400 km", value: 400, icon: "✈️" },
    ],
  },
  {
    key: "energy",
    title: "Your home energy is...",
    subtitle: "Pick what powers most of your household.",
    options: [
      { label: "Fully renewable", value: "Fully renewable", icon: "☀️" },
      { label: "Mixed grid", value: "Mixed grid", icon: "🔌" },
      { label: "Mostly fossil fuel", value: "Mostly fossil fuel", icon: "🏭" },
      { label: "Not sure", value: "Not sure", icon: "❓" },
    ],
  },
  {
    key: "food",
    title: "Typical week of eating?",
    subtitle: "Be honest — we'll suggest swaps later.",
    options: [
      { label: "Plant-based", value: "Plant-based", icon: "🥦" },
      { label: "Mostly veg + some meat", value: "Mostly veg + some meat", icon: "🥗" },
      { label: "Meat 4–5 days/week", value: "Meat 4–5 days/week", icon: "🍗" },
      { label: "Meat every day", value: "Meat every day", icon: "🥩" },
    ],
  },
  {
    key: "shopping",
    title: "How often do you shop online?",
    subtitle: "Clothes, gadgets, household goods.",
    options: [
      { label: "Rarely (monthly)", value: "Rarely (monthly)", icon: "📦" },
      { label: "A few times a month", value: "A few times a month", icon: "🛍️" },
      { label: "Weekly", value: "Weekly", icon: "📬" },
      { label: "Several times a week", value: "Several times a week", icon: "🛒" },
    ],
  },
  {
    key: "waste",
    title: "Waste management?",
    subtitle: "Roughly what happens to your trash.",
    options: [
      { label: "Recycle + compost", value: "Recycle + compost", icon: "♻️" },
      { label: "Recycle only", value: "Recycle only", icon: "🗑️" },
      { label: "Some recycling", value: "Some recycling", icon: "🚮" },
      { label: "No sorting", value: "No sorting", icon: "🪣" },
    ],
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const { user, session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [calculatedTotal, setCalculatedTotal] = useState(0);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !session) {
      toast.error("Please login to access onboarding.");
      navigate({ to: "/auth" });
    }
  }, [session, authLoading, navigate]);

  const select = async (val: string | number) => {
    const nextAnswers = { ...answers, [steps[step].key]: val };
    setAnswers(nextAnswers);

    if (step < steps.length - 1) {
      setTimeout(() => setStep(step + 1), 250);
    } else {
      // Final Step Completed! Compute & Save Baseline
      setSaving(true);
      try {
        if (!user) throw new Error("No active user session found.");

        const transType = nextAnswers.transport;
        const weeklyDist = Number(nextAnswers.distance);
        const energyType = nextAnswers.energy;
        const foodDiet = nextAnswers.food;
        const shopFreq = nextAnswers.shopping;
        const wasteRec = nextAnswers.waste;

        // 1. Calculate Baseline Footprint
        const footprint = calculateFootprint({
          transportation_type: transType,
          weekly_distance: weeklyDist,
          energy_type: energyType,
          food_diet: foodDiet,
          shopping_frequency: shopFreq,
          waste_recycling: wasteRec,
        });

        const annualEmissions = footprint.total * 12;
        const sScore = calculateSustainabilityScore(annualEmissions);

        // 2. Persist Carbon Profile in Supabase
        const { error: carbonProfileErr } = await supabase.from("carbon_profiles").upsert({
          id: user.id,
          transportation_type: transType,
          weekly_distance: weeklyDist,
          energy_type: energyType,
          food_diet: foodDiet,
          shopping_frequency: shopFreq,
          waste_recycling: wasteRec,
        });

        if (carbonProfileErr) throw carbonProfileErr;

        // 3. Save baseline footprint record
        const { error: recordErr } = await supabase.from("footprint_records").insert({
          user_id: user.id,
          transport_emissions: footprint.transport,
          energy_emissions: footprint.energy,
          food_emissions: footprint.food,
          shopping_emissions: footprint.shopping,
          waste_emissions: footprint.waste,
          total_emissions: footprint.total,
          notes: "Initial baseline footprint calculated during onboarding.",
        });

        if (recordErr) throw recordErr;

        // 4. Update profile score
        await supabase
          .from("profiles")
          .update({
            sustainability_score: sScore,
          })
          .eq("id", user.id);

        // 5. Award "Eco Beginner" Achievement (+200 XP)
        await awardAchievement(user.id, "eco_beginner");

        // Invalidate profiles query key to trigger reactive navbar/sidebar updates instantly
        queryClient.invalidateQueries({ queryKey: ["profiles", user.id] });

        setCalculatedTotal(footprint.total);
        setDone(true);
      } catch (err: any) {
        console.error("Error saving onboarding details:", err);
        toast.error("Failed to save your carbon baseline. Please try again.");
      } finally {
        setSaving(false);
      }
    }
  };

  const annual = calculatedTotal * 12;

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-eco mx-auto" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.78_0.18_155/0.18),transparent_60%)]" />

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-eco">
              <Leaf className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">
              Carbon<span className="text-gradient-eco">Lens</span>
            </span>
          </Link>
          {!done && (
            <span className="text-xs text-muted-foreground">
              Step {step + 1} of {steps.length}
            </span>
          )}
        </div>

        {/* Progress */}
        {!done && (
          <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-white/5">
            <motion.div
              className="h-full gradient-eco"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        )}

        {/* Body */}
        <div className="flex flex-1 items-center justify-center py-10">
          <AnimatePresence mode="wait">
            {saving ? (
              <motion.div
                key="saving"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-4"
              >
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-eco mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Analyzing answers and generating baseline...
                </p>
              </motion.div>
            ) : !done ? (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.35 }}
                className="w-full"
              >
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  {steps[step].title}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">{steps[step].subtitle}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {steps[step].options.map((opt) => {
                    const active = answers[steps[step].key] === opt.value;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => select(opt.value)}
                        className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                          active
                            ? "border-eco/60 bg-eco/10"
                            : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-2xl">{opt.icon}</span>
                        <span className="flex-1 text-sm font-medium">{opt.label}</span>
                        {active && <Check className="h-4 w-4 text-eco" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-8 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setStep(Math.max(0, step - 1))}
                    disabled={step === 0}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground disabled:opacity-30 hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full text-center"
              >
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full gradient-eco glow-eco animate-pulse-ring">
                  <Leaf className="h-9 w-9 text-primary-foreground" />
                </div>
                <h2 className="mt-6 text-2xl font-semibold sm:text-3xl">Your carbon baseline</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Based on your answers, here is your initial footprint profile.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-2">
                  <div className="glass rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      Monthly
                    </p>
                    <p className="mt-1 text-4xl font-semibold text-gradient-eco">
                      {calculatedTotal} kg
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">CO₂ equivalent</p>
                  </div>
                  <div className="glass rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Annual</p>
                    <p className="mt-1 text-4xl font-semibold">{annual.toLocaleString()} kg</p>
                    <p className="mt-1 text-xs text-muted-foreground">vs 4,000 kg target</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate({ to: "/app/dashboard" })}
                  className="mt-8 inline-flex items-center gap-2 rounded-xl gradient-eco px-6 py-3 text-sm font-medium text-primary-foreground glow-eco"
                >
                  Open my dashboard <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
