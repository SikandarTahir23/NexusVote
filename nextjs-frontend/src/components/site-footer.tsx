import Link from "next/link";
import { Github, GraduationCap, Mail } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

/**
 * SiteFooter — clean four-column footer for the NexusVote prototype.
 *
 *  - Column 1: brand mark + one-line tagline + academic-project disclaimer
 *  - Column 2: in-app navigation links
 *  - Column 3: tech stack (so judges can see the implementation at a glance)
 *  - Column 4: project / contact information
 */
export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 mt-16 bg-gradient-to-b from-transparent to-primary/5">
      <div className="container py-12 grid gap-10 md:grid-cols-4 text-sm">
        <div className="md:col-span-1">
          <div className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <span className="font-semibold tracking-tight text-base">
              Nexus<span className="text-gradient">Vote</span>
            </span>
          </div>
          <p className="mt-3 text-xs text-muted-foreground leading-relaxed">
            A modern, secure digital voting prototype demonstrating end-to-end
            authentication, OOP architecture, and a live admin dashboard.
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-widest text-muted-foreground/80">
            University Project · 2nd Semester
          </p>
        </div>

        <FooterColumn title="Platform">
          <FooterLink href="/">Home</FooterLink>
          <FooterLink href="/#about">About</FooterLink>
          <FooterLink href="/auth/email">Cast a Vote</FooterLink>
          <FooterLink href="/admin/login">Admin Portal</FooterLink>
        </FooterColumn>

        <FooterColumn title="Tech Stack">
          <li>Next.js 15 · React 19</li>
          <li>Tailwind CSS</li>
          <li>Framer Motion</li>
          <li>JavaScript OOP</li>
          <li>EmailJS · Mock DBMS</li>
        </FooterColumn>

        <FooterColumn title="Project">
          <li className="flex items-center gap-2">
            <GraduationCap className="h-3.5 w-3.5 opacity-70" />
            OOP &amp; DBMS Coursework
          </li>
          <li className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 opacity-70" />
            team@nexusvote.demo
          </li>
          <li className="flex items-center gap-2">
            <Github className="h-3.5 w-3.5 opacity-70" />
            Source available on request
          </li>
        </FooterColumn>
      </div>

      <div className="border-t border-border/60">
        <div className="container py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>
            &copy; {new Date().getFullYear()} NexusVote · Built for educational
            purposes only.
          </span>
          <span className="opacity-80">
            Not a real voting platform — prototype for academic evaluation.
          </span>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs font-semibold tracking-widest uppercase text-foreground/80 mb-3">
        {title}
      </div>
      <ul className="space-y-2 text-xs text-muted-foreground">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="hover:text-foreground transition-colors">
        {children}
      </Link>
    </li>
  );
}
