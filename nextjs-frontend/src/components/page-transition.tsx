"use client";

import { motion } from "framer-motion";

/**
 * PageTransition — reusable Framer Motion wrapper for page-level entrance.
 *
 * Every authenticated step uses this so the multi-page flow feels like a
 * single coherent application instead of a sequence of full reloads.
 *
 * Animation: subtle upward fade-in, with a touch of inertia. Kept short
 * (320ms) so it never makes the interface feel sluggish.
 */
export function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: [0.22, 0.8, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
