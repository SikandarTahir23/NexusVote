import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "NexusVote — Secure Digital Voting Platform",
  description:
    "NexusVote is a modern, secure digital voting prototype built for a university OOP & DBMS semester project — featuring email-based authentication, animated voting flow, and a live admin dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* `gov-bg` is repurposed as the NexusVote aurora background — class
          name kept for backward compatibility with the rest of the codebase. */}
      <body className="min-h-screen flex flex-col gov-bg">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <SiteHeader />
          <main className="flex-1 container py-10 animate-fade-in">
            {children}
          </main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
