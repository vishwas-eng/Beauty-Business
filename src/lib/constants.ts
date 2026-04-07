import { BarChart3 } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/", label: "Weekly Review", icon: BarChart3 }
] as const;

export const REQUIRED_HEADERS = [
  "date",
  "sku",
  "product_name",
  "category",
  "brand",
  "channel",
  "sales_qty",
  "sales_amount",
  "returns_qty",
  "inventory_on_hand",
  "cost_amount",
  "discount_amount"
] as const;
