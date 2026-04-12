import { BarChart3, Brain, FileText, FlaskConical, ImageIcon, Map, Package, TrendingUp, Layers, Sheet } from "lucide-react";

export interface NavItem {
  label: string;
  icon: typeof BarChart3;
  path: string;
  section?: "workspace" | "growth";
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  // Workspace
  { label: "Dashboard",      icon: BarChart3,  path: "/",                      section: "workspace" },
  { label: "Brand 360",      icon: FileText,   path: "/brand/brand-nudestix",  section: "workspace" },
  { label: "Intelligence",   icon: Brain,      path: "/intel",                 section: "workspace" },
  { label: "Image Studio",   icon: ImageIcon,  path: "/studio",                section: "workspace" },
  // Growth
  { label: "Strategy",       icon: Map,          path: "/strategy",  section: "growth", badge: "NEW" },
  { label: "Mosaic Bridge",  icon: Package,      path: "/mosaic",    section: "growth", badge: "NEW" },
  { label: "Revenue Suite",  icon: TrendingUp,   path: "/revenue",   section: "growth", badge: "NEW" },
  { label: "Research Lab",   icon: FlaskConical, path: "/research",  section: "growth", badge: "NEW" },
  { label: "Inventory",      icon: Layers,       path: "/inventory",     section: "growth", badge: "NEW" },
  { label: "Sheet Master",   icon: Brain,        path: "/sheet-master",  section: "growth", badge: "AI"  },
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
