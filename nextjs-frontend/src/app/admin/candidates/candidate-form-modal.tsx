"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImagePlus, X } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api, API_ORIGIN, type AdminCandidate } from "@/lib/api";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // mirror the backend multer limit
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * CandidateFormModal — create + edit form in one dialog.
 *
 * `target` drives the mode: "create" → empty form, an AdminCandidate →
 * pre-filled edit form, null → closed. Submits multipart FormData so a
 * symbol image can ride along; when the admin picks an emoji instead the
 * `symbolEmoji` text field is sent and the backend keeps/replaces the
 * symbol accordingly. Client-side checks mirror the backend rules so
 * most validation errors never need a round-trip.
 */
export function CandidateFormModal({
  target,
  onClose,
  onSaved,
  onUnauthorized,
}: {
  target: "create" | AdminCandidate | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onUnauthorized: () => void;
}) {
  const editing = target !== null && target !== "create" ? target : null;
  const open = target !== null;

  const [name, setName] = useState("");
  const [party, setParty] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [emoji, setEmoji] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // (Re)initialise the form whenever the dialog opens or switches target.
  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? "");
    setParty(editing?.party ?? "");
    setDescription(editing?.description ?? "");
    setStatus(editing?.status ?? "active");
    const symbolIsEmoji =
      editing && !editing.symbol.startsWith("/uploads/")
        ? editing.symbol
        : "";
    setEmoji(symbolIsEmoji);
    setFile(null);
    setPreview(null);
    setError(null);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  // Revoke the object URL when the preview changes or the modal unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function pickFile(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Only PNG, JPEG, or WebP images are allowed.");
      return;
    }
    if (f.size > MAX_IMAGE_BYTES) {
      setError("Image is too large — maximum size is 2 MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Mirror the backend's #validate rules for instant feedback.
    if (name.trim().length < 2 || name.trim().length > 100) {
      setError("Candidate name must be 2–100 characters.");
      return;
    }
    if (party.trim().length < 2 || party.trim().length > 100) {
      setError("Party name must be 2–100 characters.");
      return;
    }
    if (description.trim().length > 1000) {
      setError("Description must be 1000 characters or fewer.");
      return;
    }

    const form = new FormData();
    form.append("name", name.trim());
    form.append("party", party.trim());
    form.append("description", description.trim());
    form.append("status", status);
    if (file) {
      form.append("symbolImage", file);
    } else if (emoji.trim()) {
      form.append("symbolEmoji", emoji.trim());
    }
    // Neither file nor emoji → backend keeps the existing symbol (edit)
    // or applies the default (create).

    setSubmitting(true);
    try {
      const res = editing
        ? await api.updateCandidate(editing.id, form)
        : await api.createCandidate(form);
      onSaved(res.message);
    } catch (err) {
      if (err instanceof Error && err.name === "AdminUnauthorized") {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not save candidate.");
      setSubmitting(false);
    }
  }

  // Existing uploaded image (edit mode, no new file picked yet).
  const existingImage =
    !preview && editing && editing.symbol.startsWith("/uploads/")
      ? `${API_ORIGIN}${editing.symbol}`
      : null;

  return (
    <Dialog
      open={open}
      onClose={submitting ? () => {} : onClose}
      title={editing ? `Edit ${editing.name}` : "Add Candidate"}
      description={
        editing
          ? "Changes are saved to the database immediately."
          : "The new candidate appears on the ballot while their status is Active."
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="cf-name">Candidate name</Label>
          <Input
            id="cf-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ayesha Tariq"
            maxLength={100}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cf-party">Party name</Label>
          <Input
            id="cf-party"
            value={party}
            onChange={(e) => setParty(e.target.value)}
            placeholder="e.g. Student Voice"
            maxLength={100}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cf-description">
            Description{" "}
            <span className="text-xs text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="cf-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short bio or campaign focus…"
            maxLength={1000}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cf-status">Status</Label>
          <select
            id="cf-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "active" | "inactive")}
            className="flex h-11 w-full rounded-lg border border-input bg-secondary/50 px-3 text-sm transition-colors focus-visible:outline-none focus-visible:bg-background focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="active">Active — shown on the ballot</option>
            <option value="inactive">Inactive — hidden from voters</option>
          </select>
        </div>

        {/* Symbol: image upload OR emoji */}
        <div className="space-y-1.5">
          <Label>Symbol</Label>
          <div className="flex items-start gap-3">
            {/* Image picker + preview */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-input bg-secondary/40 transition-colors hover:border-ring"
              aria-label="Upload symbol image"
            >
              {preview || existingImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview || existingImage || ""}
                  alt="Symbol preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept={ALLOWED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />

            <div className="flex-1 space-y-1.5">
              <Input
                value={emoji}
                onChange={(e) => {
                  setEmoji(e.target.value);
                  if (e.target.value) pickFile(null); // emoji wins over file
                }}
                placeholder="…or type an emoji, e.g. 📚"
                maxLength={16}
                disabled={!!file}
              />
              <p className="text-[11px] text-muted-foreground">
                Upload a PNG/JPEG/WebP (max 2 MB) or use an emoji.
              </p>
              {file && (
                <button
                  type="button"
                  onClick={() => pickFile(null)}
                  className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                  Remove {file.name}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Create candidate"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
