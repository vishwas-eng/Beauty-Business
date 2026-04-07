import { describe, expect, it } from "vitest";
import { validateRows } from "../src/lib/upload";

describe("validateRows", () => {
  it("accepts rows with the required analytics headers", () => {
    const { result, validRows } = validateRows([
      {
        date: "2026-04-01",
        sku: "SKU-1",
        product_name: "Demo Product",
        category: "Tops",
        brand: "Aurelle",
        channel: "Shopify",
        sales_qty: 2,
        sales_amount: 1800,
        returns_qty: 0,
        inventory_on_hand: 18,
        cost_amount: 800,
        discount_amount: 100
      }
    ]);

    expect(result.errors).toEqual([]);
    expect(validRows).toHaveLength(1);
    expect(validRows[0].sales_amount).toBe(1800);
  });

  it("flags missing required headers", () => {
    const { result } = validateRows([
      {
        sku: "SKU-1",
        category: "Tops"
      }
    ]);

    expect(result.errors[0]).toContain("Missing required columns");
  });
});
