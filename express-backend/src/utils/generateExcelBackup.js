/**
 * generateExcelBackup.js — BackupManager: orchestrates the vote backup.
 *
 * This is the conductor for the "automatic Excel backup + Google Drive
 * sync" feature. It owns the sequence and the status, but delegates the
 * actual work:
 *   1. Pull the full vote set from MySQL  (voteStore.allForBackup)
 *   2. Write votes_backup.xlsx            (ExcelExportService)
 *   3. Upload/update it on Drive          (DriveService)
 *   4. Record status + log each step      (here)
 *
 * Guarantees that satisfy the feature spec:
 *  - Off the vote's critical path. run() is invoked WITHOUT await from the
 *    vote controller, so a slow or failing backup never delays or rolls
 *    back a vote.
 *  - Step isolation. The Excel write and the Drive upload are reported
 *    independently — Drive failing still leaves a valid local .xlsx and a
 *    "synced: error" status, never an exception that escapes run().
 *  - Coalescing. A simple in-flight guard means a burst of votes doesn't
 *    spawn overlapping writes; because every run rebuilds from the DB, one
 *    trailing run after the burst captures the final state. If a request
 *    arrives mid-run we mark the manager dirty and re-run once on completion.
 *
 * OOP concepts demonstrated:
 *  - DEPENDENCY INJECTION / POLYMORPHISM: the store, excel service and drive
 *    service are all injected — swap any for a test double without touching
 *    this class.
 *  - ENCAPSULATION: the status object and the in-flight flags are private.
 */
class BackupManager {
  #voteStore;
  #excel;
  #drive;
  #running;
  #dirty;
  #status;

  /**
   * @param {object} deps
   * @param {object} deps.voteStore - exposes allForBackup(): Promise<rows[]>
   * @param {object} deps.excelService - ExcelExportService
   * @param {object} deps.driveService - DriveService
   */
  constructor({ voteStore, excelService, driveService }) {
    this.#voteStore = voteStore;
    this.#excel = excelService;
    this.#drive = driveService;
    this.#running = false;
    this.#dirty = false;
    this.#status = {
      lastBackupTime: null,
      totalRecords: 0,
      driveStatus: driveService.isConfigured() ? "pending" : "not_configured",
      driveFileId: driveService.getFileId(),
      lastError: null,
      fileExists: excelService.fileExists(),
    };
  }

  /** Snapshot of the latest backup status for the admin dashboard. */
  getStatus() {
    return {
      ...this.#status,
      fileExists: this.#excel.fileExists(),
      driveConfigured: this.#drive.isConfigured(),
    };
  }

  /** Absolute path to votes_backup.xlsx (for the admin download route). */
  getFilePath() {
    return this.#excel.getFilePath();
  }

  /**
   * Run one backup cycle. Safe to call fire-and-forget. Never rejects in a
   * way the caller must handle — but we still return the promise so callers
   * can attach a .catch for logging if they want.
   */
  async run() {
    // Coalesce concurrent calls: if one is already running, just flag that
    // another rebuild is needed and let the in-flight run trigger it.
    if (this.#running) {
      this.#dirty = true;
      return this.#status;
    }

    this.#running = true;
    try {
      do {
        this.#dirty = false;
        await this.#runOnce();
      } while (this.#dirty); // a vote arrived mid-run — rebuild once more
    } finally {
      this.#running = false;
    }
    return this.#status;
  }

  /** A single pull → write → upload cycle, with per-step error isolation. */
  async #runOnce() {
    // Step 1 + 2: read from MySQL and write the workbook. If this throws the
    // whole backup failed (we have nothing to sync) — record and bail.
    let writeResult;
    try {
      const rows = await this.#voteStore.allForBackup();
      writeResult = this.#excel.writeWorkbook(rows);
      this.#status.lastBackupTime = writeResult.lastBackupTime;
      this.#status.totalRecords = writeResult.recordCount;
      this.#status.lastError = null;
      console.log(
        `[backup] votes_backup.xlsx written — ${writeResult.recordCount} record(s).`
      );
    } catch (err) {
      this.#status.lastError = err && err.message ? err.message : String(err);
      this.#status.driveStatus = "error";
      console.error("[backup] Excel write failed:", this.#status.lastError);
      return; // can't upload what we couldn't write
    }

    // Step 3: sync to Drive. Independent — a failure here leaves the local
    // backup intact and only downgrades the Drive status.
    const driveResult = await this.#drive.upload(writeResult.filePath);
    this.#status.driveStatus = driveResult.status;
    this.#status.driveFileId = driveResult.fileId;
    if (driveResult.status === "synced") {
      console.log(`[backup] Synced to Google Drive (file ${driveResult.fileId}).`);
    } else if (driveResult.status === "not_configured") {
      console.log("[backup] Google Drive not configured — local backup only.");
    } else {
      // Don't overwrite a successful write's null lastError unless Drive is
      // the only thing that failed; surface the Drive error either way.
      this.#status.lastError = driveResult.error;
      console.error("[backup] Google Drive sync failed:", driveResult.error);
    }
  }
}

module.exports = BackupManager;
