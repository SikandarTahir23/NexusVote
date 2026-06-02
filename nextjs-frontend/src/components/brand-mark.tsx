import { cn } from "@/lib/utils";

/**
 * BrandMark — the NexusVote logo placeholder.
 *
 * A pure-SVG mark so it stays crisp on any DPI, supports the dark/light theme
 * automatically via the gradient stops, and can be dropped in anywhere a
 * fixed-size square logo is wanted.
 *
 *   <BrandMark size={48} />
 *
 * The mark is a stylised checkmark inside a hex (vote/seal motif) on top of
 * the brand gradient. It mirrors the "secure + modern + futuristic" tone
 * without needing an external image asset.
 */
export function BrandMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-grid place-items-center rounded-xl",
        "shadow-lg shadow-primary/30 ring-1 ring-white/10",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundImage:
          "linear-gradient(135deg, hsl(var(--grad-from)), hsl(var(--grad-via)) 55%, hsl(var(--grad-to)))",
      }}
      aria-hidden
    >
      {/* Faint inner highlight to give it a glassy bevel. */}
      <span className="absolute inset-px rounded-[10px] bg-gradient-to-b from-white/20 to-white/0 pointer-events-none" />

      <svg
        viewBox="0 0 32 32"
        width={Math.round(size * 0.55)}
        height={Math.round(size * 0.55)}
        fill="none"
        className="relative text-white drop-shadow"
      >
        {/* Hex outline — secure-seal vibe */}
        <path
          d="M16 3 L27 9 L27 23 L16 29 L5 23 L5 9 Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {/* Check mark */}
        <path
          d="M11 16.5 L14.5 20 L21 12.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
