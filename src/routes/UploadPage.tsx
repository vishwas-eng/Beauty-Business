import { ChangeEvent, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { parseWorkbook, validateRows } from "../lib/upload";
import { uploadRows } from "../lib/api";

export function UploadPage() {
  const [fileName, setFileName] = useState("");
  const [summary, setSummary] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBusy(true);
    setErrors([]);
    setFileName(file.name);

    try {
      const rows = await parseWorkbook(file);
      const { result, validRows } = validateRows(rows);
      setErrors(result.errors);

      if (result.errors.length === 0) {
        const upload = await uploadRows(validRows);
        setSummary(
          `Imported ${upload.imported} rows from ${file.name}. Skipped ${result.skippedRows} rows.`
        );
      } else {
        setSummary(
          `Parsed ${result.validRows} valid rows from ${file.name}, but some required columns are missing.`
        );
      }
    } catch (error) {
      setSummary("Could not parse that file. Use .xlsx or .csv with the required headers.");
      setErrors([error instanceof Error ? error.message : "Unexpected upload error"]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="panel upload-panel">
        <div className="panel-header">
          <div>
            <h2>Excel Upload</h2>
            <p>Upload `.xlsx` or `.csv` files and normalize them into the analytics schema.</p>
          </div>
        </div>

        <label className="upload-dropzone">
          <input type="file" accept=".xlsx,.csv" onChange={handleFile} />
          <UploadCloud size={28} />
          <strong>{busy ? "Reading file..." : "Drop a file here or browse"}</strong>
          <span>Required columns: date, sku, category, brand, channel, sales, inventory, cost.</span>
        </label>

        {fileName ? (
          <div className="upload-summary">
            <FileSpreadsheet size={18} />
            <span>{fileName}</span>
          </div>
        ) : null}

        {summary ? <p className="status-note">{summary}</p> : null}
        {errors.length > 0 ? (
          <div className="error-list">
            {errors.map((error) => (
              <p key={error}>{error}</p>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
