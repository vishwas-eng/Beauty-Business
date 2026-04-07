import { BarChart3, Database, FileText, Lock, Scale, Sparkles } from "lucide-react";

export interface NavItem {
  label: string;
  icon: typeof BarChart3;
  active?: boolean;
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: BarChart3, active: true },
  { label: "Data Sources", icon: Database, comingSoon: true },
  { label: "AI Insights", icon: Sparkles, comingSoon: true },
  { label: "Legal", icon: Scale, comingSoon: true },
  { label: "Documents", icon: FileText, comingSoon: true },
  { label: "Access Control", icon: Lock, comingSoon: true }
];

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
