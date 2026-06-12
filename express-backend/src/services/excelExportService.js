const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

/**
 * ExcelExportService — writes the vote backup workbook (votes_backup.xlsx).
 *
 * Responsibility is deliberately narrow: take an array of already-shaped
 * vote rows and persist them as an .xlsx file on disk. It knows nothing
 * about MySQL or Google Drive — the BackupManager (utils/generateExcelBackup)
 * supplies the rows and decides what to do with the file afterwards. That
 * separation keeps this class trivially unit-testable and swappable.
 *
 * The whole sheet is rebuilt from the supplied rows on every call (the
 * caller hands us the full set queried from MySQL), so the file is always
 * consistent with the database and self-heals if it was deleted or edited
 * out of band.
 *
 * OOP concepts demonstrated:
 *  - ENCAPSULATION: the output directory + filename are private.
 *  - ABSTRACTION: callers say "write these rows"; the xlsx mechanics,
 *    header ordering, and directory creation are hidden.
 */

// Column order is contractual — it's what the admin opens in Excel and what
// the feature spec asks for. Keep these labels and this order stable.
const COLUMNS = [
  "Reference Number",
  "Voter Name",
  "CNIC",
  "Email",
  "Candidate Name",
  "Party Name",
  "Vote Timestamp",
];

const FILE_NAME = "votes_backup.xlsx";

class ExcelExportService {
  #dir;
  #filePath;

  /**
   * @param {object} opts
   * @param {string} opts.backupDir - directory the workbook is written to.
   */
  constructor({ backupDir }) {
    this.#dir = backupDir;
    this.#filePath = path.join(backupDir, FILE_NAME);
  }

  /** Absolute path the workbook is (or will be) written to. */
  getFilePath() {
    return this.#filePath;
  }

  /** True once the workbook exists on disk. */
  fileExists() {
    return fs.existsSync(this.#filePath);
  }

  /**
   * Rebuild votes_backup.xlsx from `rows`.
   *
   * @param {Array<object>} rows - each row shaped like:
   *   { reference, voterName, cnic, email, candidateName, partyName, timestamp }
   * @returns {{ filePath: string, recordCount: number, lastBackupTime: string }}
   */
  writeWorkbook(rows) {
    // Ensure the destination directory exists — first run starts empty.
    fs.mkdirSync(this.#dir, { recursive: true });

    // Map each domain row onto the contractual column labels. Doing this
    // explicitly (rather than json_to_sheet on raw rows) guarantees the
    // header order and copes with missing/null fields gracefully.
    const sheetRows = rows.map((r) => ({
      "Reference Number": r.reference || "",
      "Voter Name": r.voterName || "",
      "CNIC": r.cnic || "",
      "Email": r.email || "",
      "Candidate Name": r.candidateName || "",
      "Party Name": r.partyName || "",
      "Vote Timestamp": r.timestamp || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetRows, { header: COLUMNS });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Votes");

    // Write to a temp file then rename — an atomic-ish swap so a reader
    // (e.g. the admin download) never sees a half-written workbook. The
    // temp name ends in .tmp, so pass bookType explicitly — writeFile would
    // otherwise try to infer the (unrecognised) format from the extension.
    const tmp = this.#filePath + ".tmp";
    XLSX.writeFile(workbook, tmp, { bookType: "xlsx" });
    fs.renameSync(tmp, this.#filePath);

    return {
      filePath: this.#filePath,
      recordCount: rows.length,
      lastBackupTime: new Date().toISOString(),
    };
  }
}

module.exports = ExcelExportService;
module.exports.COLUMNS = COLUMNS;
module.exports.FILE_NAME = FILE_NAME;
