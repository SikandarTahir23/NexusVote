"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";

/**
 * AnimatedError — reusable Framer-Motion error banner.
 *
 * Used for the "OTP is incorrect" animated error message (and any other
 * inline form error). The card itself fades + slides in; a small shake on
 * the icon makes it feel like a security warning rather than passive text.
 */
export function AnimatedError({ message }: { message?: string | null }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {message ? (
        <motion.div
          key={message}
          role="alert"
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <motion.span
            // Quick horizontal shake on first appearance.
            initial={{ x: 0 }}
            animate={{ x: [0, -4, 4, -3, 3, 0] }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="mt-0.5 shrink-0"
          >
            <AlertTriangle className="h-4 w-4" />
          </motion.span>
          <span>{message}</span>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
