const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

/**
 * DriveService — uploads votes_backup.xlsx to Google Drive via a Service
 * Account and keeps a single Drive file in sync (update-in-place, never a
 * new copy per vote).
 *
 * Design rules (driven by the feature spec):
 *  - NEVER throws. Every method returns a result object; a Drive outage
 *    must never break a vote or the local Excel backup. The caller logs
 *    whatever we report.
 *  - Optional. If no service-account key is configured, isConfigured() is
 *    false and upload() is a no-op reporting status "not_configured". The
 *    local .xlsx is still written by the ExcelExportService regardless.
 *  - Stateful file id. The Drive file id is the one piece of state that
 *    must survive restarts so we UPDATE the same file instead of creating
 *    duplicates. A process can't rewrite its own .env, so we seed the id
 *    from GOOGLE_DRIVE_FILE_ID and persist any runtime-created id to a
 *    sidecar JSON (backup-state.json) in the backup dir.
 *
 * OOP concepts demonstrated:
 *  - ENCAPSULATION: credentials, the lazily-built Drive client, and the
 *    cached file id are all private.
 *  - ABSTRACTION: callers just call upload(filePath); auth, create-vs-update
 *    selection, and id persistence are hidden.
 */
class DriveService {
  #keyFile;
  #folderId;
  #fileId;
  #fileName;
  #statePath;
  #client; // lazily built googleapis drive client

  /**
   * @param {object} opts
   * @param {string} [opts.keyFile]   - path to the service-account JSON.
   * @param {string} [opts.folderId]  - optional Drive folder to create into.
   * @param {string} [opts.fileId]    - seed file id (from GOOGLE_DRIVE_FILE_ID).
   * @param {string} [opts.fileName]  - remote file name. Defaults votes_backup.xlsx.
   * @param {string} opts.backupDir   - where the sidecar state file lives.
   */
  constructor({ keyFile, folderId, fileId, fileName, backupDir }) {
    this.#keyFile = keyFile ? this.#resolveKeyFile(keyFile) : null;
    this.#folderId = folderId || null;
    this.#fileName = fileName || "votes_backup.xlsx";
    this.#statePath = path.join(backupDir, "backup-state.json");
    this.#client = null;
    // Prefer a previously-persisted id over the .env seed so runtime
    // creations win across restarts.
    this.#fileId = this.#readPersistedFileId() || fileId || null;
  }

  /**
   * Resolve a possibly-relative key path against the backend root (two
   * levels up from this file: src/services -> backend). Keeps `./credentials/
   * service-account.json` working regardless of the process CWD.
   */
  #resolveKeyFile(keyFile) {
    if (path.isAbsolute(keyFile)) return keyFile;
    return path.resolve(__dirname, "..", "..", keyFile);
  }

  /**
   * Configured == we have a key file path that actually exists on disk.
   * A missing file is treated as "not configured" rather than an error so
   * the demo runs out of the box with Drive simply disabled.
   */
  isConfigured() {
    return Boolean(this.#keyFile) && fs.existsSync(this.#keyFile);
  }

  /** The Drive file id currently in use (null until first upload). */
  getFileId() {
    return this.#fileId;
  }

  /**
   * Upload (create or update) the workbook at `filePath`.
   *
   * @returns {Promise<{ synced: boolean, status: string, fileId: string|null, error: string|null }>}
   *   status is one of: "synced" | "not_configured" | "error".
   */
  async upload(filePath) {
    if (!this.isConfigured()) {
      return { synced: false, status: "not_configured", fileId: null, error: null };
    }
    if (!fs.existsSync(filePath)) {
      return {
        synced: false,
        status: "error",
        fileId: this.#fileId,
        error: "Local backup file does not exist yet.",
      };
    }

    try {
      const drive = await this.#getClient();
      const media = {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        body: fs.createReadStream(filePath),
      };

      if (this.#fileId) {
        // Update the existing file's contents in place.
        await drive.files.update({ fileId: this.#fileId, media });
      } else {
        // First upload — create the file, optionally inside a folder.
        const requestBody = { name: this.#fileName };
        if (this.#folderId) requestBody.parents = [this.#folderId];
        const res = await drive.files.create({
          requestBody,
          media,
          fields: "id",
        });
        this.#fileId = res.data.id;
        this.#persistFileId(this.#fileId);
      }

      return { synced: true, status: "synced", fileId: this.#fileId, error: null };
    } catch (err) {
      // A stale/deleted file id (404) would otherwise wedge us forever —
      // clear it so the next run recreates the file.
      if (err && (err.code === 404 || err.code === "404")) {
        this.#fileId = null;
        this.#persistFileId(null);
      }
      return {
        synced: false,
        status: "error",
        fileId: this.#fileId,
        error: err && err.message ? err.message : String(err),
      };
    }
  }

  // ---- private helpers --------------------------------------------------

  /** Build (once) and cache the authenticated Drive v3 client. */
  async #getClient() {
    if (this.#client) return this.#client;
    const auth = new google.auth.GoogleAuth({
      keyFile: this.#keyFile,
      // Full drive scope is required because we update a file that the user
      // created and shared with the service account via the Drive UI. The
      // narrower drive.file scope only exposes files the app itself created
      // (or that were opened through the Google Picker), so a manually-shared
      // file reports "File not found" under it.
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const authClient = await auth.getClient();
    this.#client = google.drive({ version: "v3", auth: authClient });
    return this.#client;
  }

  /** Read a previously-persisted Drive file id, if any. Best-effort. */
  #readPersistedFileId() {
    try {
      const raw = fs.readFileSync(this.#statePath, "utf8");
      const data = JSON.parse(raw);
      return typeof data.fileId === "string" ? data.fileId : null;
    } catch {
      return null; // no sidecar yet, or unreadable — fine
    }
  }

  /** Persist the Drive file id so updates survive a restart. Best-effort. */
  #persistFileId(fileId) {
    try {
      fs.mkdirSync(path.dirname(this.#statePath), { recursive: true });
      fs.writeFileSync(
        this.#statePath,
        JSON.stringify({ fileId: fileId || null }, null, 2)
      );
    } catch (err) {
      console.error("[drive] could not persist file id:", err.message);
    }
  }
}

module.exports = DriveService;
