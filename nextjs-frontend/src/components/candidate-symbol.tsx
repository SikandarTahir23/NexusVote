import { ArrowUpRight, Star, BookOpen, Trees, Lightbulb } from "lucide-react";

const SYMBOL_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Arrow: ArrowUpRight,
  Star: Star,
  Book: BookOpen,
  Tree: Trees,
};

export function CandidateSymbol({
  name,
  color,
  className = "h-8 w-8",
}: {
  name: string;
  color: string;
  className?: string;
}) {
  const Icon = SYMBOL_MAP[name] || Lightbulb;
  return (
    <div
      className="grid h-16 w-16 place-items-center rounded-xl ring-2 ring-offset-2 ring-offset-card transition-transform group-hover:scale-110"
      style={{
        backgroundColor: `${color}1A`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}33`,
      }}
    >
      <Icon className={className} />
    </div>
  );
}
