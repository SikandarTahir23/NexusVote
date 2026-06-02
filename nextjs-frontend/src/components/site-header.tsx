import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandMark } from "@/components/brand-mark";

/**
 * SiteHeader — sticky glassmorphism navigation bar for NexusVote.
 *
 *  - Top accent strip uses the brand gradient (indigo → violet → magenta)
 *  - A slim utility row replaces the previous "government portal" bar with
 *    an academic project credit and a subtle status pill
 *  - The main row uses the .glass utility so it floats over scrolling content
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="h-1 gov-stripe" />

      <div className="bg-primary/95 text-primary-foreground text-xs">
        <div className="container flex h-8 items-center justify-between">
          <span className="flex items-center gap-2 opacity-95">
            <Sparkles className="h-3.5 w-3.5" />
            University Semester Project · OOP &amp; DBMS Prototype
          </span>
          <span className="hidden sm:flex items-center gap-4 opacity-90">
            <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
            <span>Demo build · v1.0</span>
          </span>
        </div>
      </div>

      <div className="border-b border-border/60 glass">
        <div className="container flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <BrandMark size={44} />
            <div className="flex flex-col leading-tight">
              <span className="font-semibold tracking-tight text-lg">
                Nexus<span className="text-gradient">Vote</span>
              </span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
                Secure Digital Voting Platform
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <NavLink href="/">Home</NavLink>
            <NavLink href="/#about">About</NavLink>
            <NavLink href="/auth/email">Vote</NavLink>
            <NavLink href="/admin/login">Admin</NavLink>
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative after:absolute after:left-3 after:right-3 after:bottom-1.5 after:h-px after:scale-x-0 hover:after:scale-x-100 after:origin-left after:transition-transform after:bg-gradient-to-r after:from-primary after:to-accent"
    >
      {children}
    </Link>
  );
}
