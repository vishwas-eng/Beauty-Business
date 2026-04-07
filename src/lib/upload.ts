import { REQUIRED_HEADERS } from "./constants";
import { NormalizedRow, UploadValidationResult } from "../types/domain";

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function asNumber(value: unknown) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

export async function parseWorkbook(file: File) {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: ""
  });

  const normalizedRows = rows.map((row) => {
    const shaped: Record<string, unknown> = {};
    Object.entries(row).forEach(([key, value]) => {
      shaped[normalizeHeader(key)] = value;
    });
    return shaped;
  });

  return normalizedRows;
}

export function validateRows(rows: Record<string, unknown>[]) {
  const errors: string[] = [];

  const missing = REQUIRED_HEADERS.filter(
    (header) => !rows.some((row) => Object.prototype.hasOwnProperty.call(row, header))
  );

  if (missing.length > 0) {
    errors.push(`Missing required columns: ${missing.join(", ")}`);
  }

  const validRows: NormalizedRow[] = rows
    .filter((row) => String(row.sku ?? "").trim().length > 0)
    .map((row) => ({
      date: String(row.date ?? ""),
      sku: String(row.sku ?? ""),
      product_name: String(row.product_name ?? ""),
      category: String(row.category ?? ""),
      brand: String(row.brand ?? ""),
      channel: String(row.channel ?? ""),
      sales_qty: asNumber(row.sales_qty),
      sales_amount: asNumber(row.sales_amount),
      returns_qty: asNumber(row.returns_qty),
      inventory_on_hand: asNumber(row.inventory_on_hand),
      cost_amount: asNumber(row.cost_amount),
      discount_amount: asNumber(row.discount_amount)
    }));

  const result: UploadValidationResult = {
    validRows: validRows.length,
    skippedRows: rows.length - validRows.length,
    errors
  };

  return { result, validRows };
}
