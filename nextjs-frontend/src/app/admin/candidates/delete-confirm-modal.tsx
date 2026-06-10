"use client";

import { useEffect, useState } from "react";
import { Loader2, Trash2, ShieldAlert } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, type AdminCandidate } from "@/lib/api";

/**
 * DeleteConfirmModal — the accidental-deletion guard.
 *
 * Deleting always requires explicit confirmation here. If the backend
 * refuses because the candidate has received votes (409), we surface the
 * server's message and offer the recommended alternative — setting them
 * Inactive — as a one-click action in the same dialog.
 */
export function DeleteConfirmModal({
  target,
  onClose,
  onDone,
  onError,
  onUnauthorized,
}: {
  target: AdminCandidate | null;
  onClose: () => void;
  onDone: (message: string) => void;
  onError: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  // Reset the blocked state each time a new candidate is targeted.
  useEffect(() => {
    setBlocked(null);
    setBusy(false);
  }, [target?.id]);

  if (!target) return <Dialog open={false} onClose={onClose} title="">{null}</Dialog>;

  async function confirmDelete() {
    if (!target) return;
    setBusy(true);
    try {
      const res = await api.deleteCandidate(target.id);
      onDone(res.message);
    } catch (err) {
      if (err instanceof Error && err.name === "AdminUnauthorized") {
        onUnauthorized();
        return;
      }
      const message =
        err instanceof Error ? err.message : "Could not delete candidate.";
      // The has-votes case gets the inline "Set Inactive instead" path;
      // anything else is a plain error toast.
      if (/received votes/i.test(message)) {
        setBlocked(message);
      } else {
        onError(message);
        onClose();
      }
      setBusy(false);
    }
  }

  async function setInactiveInstead() {
    if (!target) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("status", "inactive");
      await api.updateCandidate(target.id, form);
      onDone(`"${target.name}" set to Inactive — hidden from the ballot.`);
    } catch (err) {
      if (err instanceof Error && err.name === "AdminUnauthorized") {
        onUnauthorized();
        return;
      }
      onError(
        err instanceof Error ? err.message : "Could not update candidate."
      );
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={true}
      onClose={busy ? () => {} : onClose}
      title={`Delete ${target.name}?`}
      description={
        blocked
          ? undefined
          : "This permanently removes the candidate from the database. This action cannot be undone."
      }
      className="max-w-md"
    >
      {blocked ? (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm">
            <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
            <span className="text-foreground/90">{blocked}</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={setInactiveInstead} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Set Inactive instead
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Delete candidate
          </Button>
        </div>
      )}
    </Dialog>
  );
}
