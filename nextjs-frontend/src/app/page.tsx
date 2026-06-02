import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Vote,
  BadgeCheck,
  Mail,
  Lock,
  CheckCircle2,
  Sparkles,
  Cpu,
  Database,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: Mail,
    title: "Verify Your Email",
    body: "Enter your email and confirm the 6-digit one-time passcode delivered to your inbox via EmailJS.",
  },
  {
    icon: Vote,
    title: "Cast Your Vote",
    body: "Confirm your CNIC, review the candidate roster, and securely cast one ballot — duplicates are blocked.",
  },
  {
    icon: BadgeCheck,
    title: "Instant Confirmation",
    body: "Receive an animated success screen with a reference receipt and timestamp for your records.",
  },
];

const assurances = [
  { icon: Lock, label: "End-to-end secure session" },
  { icon: ShieldCheck, label: "Duplicate-vote protection" },
  { icon: CheckCircle2, label: "Independently auditable" },
];

const techBadges = [
  { icon: Cpu, label: "JavaScript OOP" },
  { icon: Layers, label: "Next.js · Tailwind" },
  { icon: Database, label: "DBMS Schema (mock)" },
  { icon: Sparkles, label: "Framer Motion" },
];

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* ============================================================
            HERO
         ============================================================ */}
      <section className="relative isolate overflow-hidden rounded-3xl">
        {/* Aurora orbs — purely decorative, pointer-events-none */}
        <span
          className="aurora-orb animate-float-slow"
          style={{
            top: "-80px",
            left: "-60px",
            width: 360,
            height: 360,
            background:
              "radial-gradient(closest-side, hsl(var(--grad-from) / 0.7), transparent 70%)",
          }}
        />
        <span
          className="aurora-orb animate-float-slow"
          style={{
            top: "20px",
            right: "-80px",
            width: 300,
            height: 300,
            background:
              "radial-gradient(closest-side, hsl(var(--grad-to) / 0.6), transparent 70%)",
            animationDelay: "1.5s",
          }}
        />

        <div className="relative px-6 py-20 sm:py-24 text-center max-w-3xl mx-auto animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-primary backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            NexusVote · Academic Prototype
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Your vote.{" "}
            <span className="text-gradient">Secure. Verified. Counted.</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
            A modern digital voting platform showcasing end-to-end
            authentication, an animated voting workflow, and a live admin
            dashboard — built as a 2nd-semester OOP &amp; DBMS project.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <Button asChild size="lg" className="btn-gradient hover:opacity-95">
              <Link href="/auth/email">
                Start Voting <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="#how-it-works">How it works</Link>
            </Button>
          </div>

          <ul className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground">
            {assurances.map((a) => {
              const Icon = a.icon;
              return (
                <li
                  key={a.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/70 backdrop-blur px-3 py-1.5"
                >
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {a.label}
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ============================================================
            HOW IT WORKS — three glass cards
         ============================================================ */}
      <section id="how-it-works" className="space-y-8">
        <div className="text-center max-w-2xl mx-auto animate-fade-up">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Workflow
          </div>
          <h2 className="mt-2 text-3xl md:text-4xl font-semibold tracking-tight">
            Three steps from <span className="text-gradient">verified</span> to{" "}
            <span className="text-gradient">cast</span>.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every step is animated, validated, and built on top of a clean
            object-oriented authentication layer.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 stagger">
          {steps.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                className="relative overflow-hidden glass neon-ring transition-transform duration-300 hover:-translate-y-1.5"
              >
                <CardContent className="p-7">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground">
                        STEP {String(i + 1).padStart(2, "0")}
                      </div>
                      <h3 className="mt-1 font-semibold text-lg">{f.title}</h3>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                    {f.body}
                  </p>
                </CardContent>
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              </Card>
            );
          })}
        </div>
      </section>

      {/* ============================================================
            ABOUT
         ============================================================ */}
      <section id="about" className="relative overflow-hidden">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr] items-center">
          <div className="space-y-5 animate-fade-up">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              About NexusVote
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Built as a <span className="text-gradient">university project</span>{" "}
              — engineered like a product.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              This project is a prototype digital voting platform developed for
              educational purposes as part of an{" "}
              <strong className="text-foreground">OOP and DBMS</strong> semester
              project. The system demonstrates secure authentication, digital
              voting workflows, and modern frontend architecture using
              JavaScript and Next.js.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The authentication layer is built around real OOP concepts —{" "}
              <strong className="text-foreground">encapsulation</strong>,{" "}
              <strong className="text-foreground">inheritance</strong>,{" "}
              <strong className="text-foreground">abstraction</strong>, and{" "}
              <strong className="text-foreground">polymorphism</strong> — with
              dedicated classes for users, admins, OTPs, votes, and the
              dashboard manager.
            </p>

            <ul className="grid grid-cols-2 gap-2 pt-2">
              {techBadges.map((t) => {
                const Icon = t.icon;
                return (
                  <li
                    key={t.label}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card/70 backdrop-blur px-3 py-2 text-xs"
                  >
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    {t.label}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Decorative "code window" — pure CSS, no syntax highlighter dependency */}
          <div className="relative animate-fade-up">
            <div className="rounded-2xl border border-border glass overflow-hidden shadow-2xl shadow-primary/20">
              <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5 bg-background/40">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  oop/User.js
                </span>
              </div>
              <pre className="p-5 text-[12px] leading-relaxed font-mono text-foreground/90 overflow-x-auto">
{`// Inheritance + Encapsulation
class User extends Person {
  #cnic;            // private field
  #hasVoted = false;

  constructor({ email, name, cnic }) {
    super({ email, name });
    this.#cnic = User.normalizeCnic(cnic);
  }

  getRole()    { return "voter"; }   // polymorphism
  hasVoted()   { return this.#hasVoted; }
  recordVote() { this.#hasVoted = true; }
}`}
              </pre>
            </div>
            <span
              className="aurora-orb"
              style={{
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                background:
                  "radial-gradient(closest-side, hsl(var(--grad-via) / 0.55), transparent 70%)",
              }}
            />
          </div>
        </div>
      </section>

      {/* ============================================================
            FINAL CTA
         ============================================================ */}
      <section className="relative overflow-hidden rounded-3xl border border-border glass p-10 sm:p-14 text-center">
        <span
          className="aurora-orb"
          style={{
            top: -60,
            left: "20%",
            width: 240,
            height: 240,
            background:
              "radial-gradient(closest-side, hsl(var(--grad-from) / 0.6), transparent 70%)",
          }}
        />
        <h3 className="text-2xl md:text-3xl font-semibold tracking-tight">
          Ready to see the prototype in action?
        </h3>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
          The flow takes under a minute. OTPs run in demo mode out of the box —
          no configuration required.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <Button asChild size="lg" className="btn-gradient hover:opacity-95">
            <Link href="/auth/email">
              Start Voting <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/admin/login">View Admin Dashboard</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
