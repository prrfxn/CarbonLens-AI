import { cn } from "@/lib/utils";
import type { HTMLAttributes, ReactNode } from "react";

export function GlassCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { children?: ReactNode }) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-5 transition-all duration-300 hover:border-white/15",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
