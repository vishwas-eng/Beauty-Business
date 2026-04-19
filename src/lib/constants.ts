import { BarChart3, Brain, FileText, FlaskConical, ImageIcon, Map, Package, TrendingUp, Layers, Database, Monitor, Kanban } from "lucide-react";

export interface NavItem {
  label: string;
  icon: typeof BarChart3;
  path: string;
  section?: "workspace" | "growth";
  badge?: string;
  comingSoon?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  // Workspace — core pages (live)
  { label: "Dashboard",      icon: BarChart3,    path: "/",                      section: "workspace" },
  { label: "Pipeline",       icon: Kanban,       path: "/pipeline",              section: "workspace", badge: "NEW" },
  { label: "Brand 360",      icon: FileText,     path: "/brand/brand-nudestix",  section: "workspace" },
  { label: "Revenue Suite",  icon: TrendingUp,   path: "/revenue",               section: "workspace" },
  { label: "Presentation",   icon: Monitor,      path: "/presentation",          section: "workspace" },
  // Growth — live features
  { label: "One Brain",      icon: Brain,        path: "/brain",         section: "growth", badge: "AI"  },
  { label: "Data Workspace", icon: Database,     path: "/data-studio",   section: "growth", badge: "NEW" },
  // Coming Soon
  { label: "Intelligence",   icon: Brain,        path: "/intel",         section: "growth", comingSoon: true },
  { label: "Image Studio",   icon: ImageIcon,    path: "/studio",        section: "growth", comingSoon: true },
  { label: "Strategy",       icon: Map,          path: "/strategy",      section: "growth", comingSoon: true },
  { label: "Mosaic Bridge",  icon: Package,      path: "/mosaic",        section: "growth", comingSoon: true },
  { label: "Research Lab",   icon: FlaskConical, path: "/research",      section: "growth", comingSoon: true },
  { label: "Inventory",      icon: Layers,       path: "/inventory",     section: "growth", comingSoon: true },
  { label: "Sheet Master",   icon: Brain,        path: "/sheet-master",  section: "growth", comingSoon: true },
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
