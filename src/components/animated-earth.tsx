import { motion } from "framer-motion";

export function AnimatedEarth() {
  return (
    <div className="relative mx-auto h-[320px] w-[320px] sm:h-[420px] sm:w-[420px]">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,oklch(0.78_0.18_155/0.35),transparent_60%)] blur-2xl" />
      {/* Orbiting ring */}
      <motion.div
        className="absolute inset-4 rounded-full border border-white/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-eco shadow-[0_0_12px_var(--eco)]" />
      </motion.div>
      <motion.div
        className="absolute inset-10 rounded-full border border-white/5"
        animate={{ rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <div className="absolute top-1/2 -right-1 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-ocean shadow-[0_0_10px_var(--ocean)]" />
      </motion.div>

      {/* Earth */}
      <motion.div
        className="absolute inset-16 overflow-hidden rounded-full"
        style={{
          background:
            "radial-gradient(circle at 30% 30%, oklch(0.82 0.18 175), oklch(0.45 0.12 220) 55%, oklch(0.22 0.06 230) 100%)",
          boxShadow: "inset -20px -20px 60px rgba(0,0,0,0.6), 0 0 80px oklch(0.72 0.15 230 / 0.5)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      >
        {/* Continents — abstract blobs */}
        <div className="absolute top-[20%] left-[15%] h-12 w-20 rounded-[40%_60%_55%_45%/50%_45%_55%_50%] bg-leaf/70 blur-[1px]" />
        <div className="absolute top-[45%] left-[55%] h-16 w-14 rounded-[60%_40%_50%_50%] bg-leaf/60 blur-[1px]" />
        <div className="absolute bottom-[15%] left-[25%] h-10 w-16 rounded-[50%_50%_60%_40%] bg-leaf/50 blur-[1px]" />
        <div className="absolute top-[10%] right-[15%] h-8 w-10 rounded-full bg-leaf/40 blur-[1px]" />
        {/* Clouds */}
        <motion.div
          className="absolute inset-0"
          animate={{ rotate: -360 }}
          transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute top-[25%] left-[40%] h-3 w-12 rounded-full bg-white/30 blur-sm" />
          <div className="absolute top-[60%] left-[10%] h-2 w-16 rounded-full bg-white/25 blur-sm" />
          <div className="absolute top-[70%] right-[15%] h-3 w-10 rounded-full bg-white/30 blur-sm" />
        </motion.div>
      </motion.div>

      {/* Floating leaves */}
      <motion.div
        className="absolute top-4 right-8 text-2xl"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        🌿
      </motion.div>
      <motion.div
        className="absolute bottom-6 left-4 text-2xl"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
      >
        🍃
      </motion.div>
    </div>
  );
}
