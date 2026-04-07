export type UserRole = "admin" | "viewer";

export type TimeRange = "7d" | "mtd" | "all";

export interface SessionUser {
  email: string;
  role: UserRole;
  workspaceId: string;
  workspaceName: string;
  demoMode: boolean;
}

export interface KpiMetric {
  label: string;
  value: string;
  delta: string;
  tone: "blue" | "green" | "orange" | "purple";
  hint: string;
  detailTitle?: string;
  detailItems?: string[];
}

export interface AlertItem {
  id: string;
  tone: "warning" | "danger" | "info";
  title: string;
  detail: string;
}

export interface TrendPoint {
  label: string;
  primary: number;
  secondary: number;
  tertiary: number;
}

export interface PerformanceRow {
  brand: string;
  category: string;
  segment?: string;
  company?: string;
  sourceCountry?: string;
  launchMarket: string;
  quadrant?: string;
  status: string;
  workingDays: number;
  progress: number;
  nextStep: string;
  followUpStatus?: string;
  holdReason?: string;
  warning?: string;
  leadToMqlDays?: number;
  mqlToSqlDays?: number;
  sqlToCommercialsDays?: number;
  commercialsToOdDays?: number;
}

export interface CategoryBreakdown {
  category: string;
  revenue: number;
  inventoryValue: number;
}

export interface InsightItem {
  id: string;
  title: string;
  summary: string;
  priority: "high" | "medium" | "low";
}

export interface SourceFieldReference {
  label: string;
  value: string;
}

export interface LegalQueueItem {
  id: string;
  brand: string;
  entityName: string;
  registeredAddress?: string;
  category: string;
  market: string;
  stage: string;
  owner: string;
  ndaStatus: "Awaiting details" | "Ready to prepare" | "Ready to send" | "Sent for legal review";
  termSheetStatus: string;
  signatoryName: string;
  signatoryTitle: string;
  signatoryEmail: string;
  lastEmailSummary: string;
  requestedAction: string;
  templateName: string;
  templateSourceUrl?: string;
  templateStatus?: "brand-specific draft" | "ready template";
  sourceFields: SourceFieldReference[];
  extractionConfidence?: "high" | "medium" | "low";
}

export interface FilledNdaPacket {
  brandId: string;
  brand: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  attachmentName: string;
  preparedAt: string;
  sentAt: string | null;
  status: "drafted" | "sent";
  filledFields: SourceFieldReference[];
  missingFields: string[];
  readyForReview: boolean;
  readyToSend: boolean;
  sourceDocumentUrl?: string;
  generatedDocumentType?: "review-html" | "google-doc" | "pdf";
}

export interface AgentResultRow {
  brand: string;
  market?: string;
  stage?: string;
  category?: string;
  owner?: string;
  nextStep?: string;
  ndaStatus?: string;
  summary?: string;
}

export interface AgentResponse {
  ok: boolean;
  query: string;
  answer: string;
  sqlPreview: string;
  resultType: "opportunities" | "legal" | "insights" | "overview";
  rows: AgentResultRow[];
  suggestions: string[];
}

export interface BrandDocument {
  id: string;
  title: string;
  kind: "nda" | "term-sheet" | "proposal" | "deck" | "report";
  status: string;
  url?: string;
}

export interface EmailUpdate {
  id: string;
  brand: string;
  subject: string;
  sender: string;
  timestamp: string;
  status: "unread" | "waiting" | "sent" | "done";
  summary: string;
  actionNeeded: string;
}

export interface ActionItem {
  id: string;
  brand: string;
  owner: string;
  title: string;
  dueLabel: string;
  priority: "high" | "medium" | "low";
  status: "open" | "in-progress" | "waiting" | "done";
  source: "email" | "tracker" | "legal" | "meeting";
}

export interface BrandProfile {
  id: string;
  brand: string;
  market: string;
  stage: string;
  owner: string;
  category: string;
  summary: string;
  nextStep: string;
  legalStatus: string;
  lastUpdate: string;
  keyContacts: string[];
  documents: BrandDocument[];
}

export interface DashboardPayload {
  generatedAt: string;
  lastSyncedAt: string;
  sourceStatus: "live" | "demo" | "stale";
  automation: AutomationStatus;
  sheetHeaders: string[];
  notionContext: NotionContextItem[];
  metrics: KpiMetric[];
  alerts: AlertItem[];
  trend: TrendPoint[];
  performance: PerformanceRow[];
  categoryMix: CategoryBreakdown[];
  inventoryHealth: CategoryBreakdown[];
  insights: InsightItem[];
  legalQueue: LegalQueueItem[];
  activeNdaPacket: FilledNdaPacket | null;
  inboxUpdates: EmailUpdate[];
  actionItems: ActionItem[];
  brandProfiles: BrandProfile[];
}

export interface SourceConfig {
  sheetId: string;
  tabName: string;
  range: string;
  enabled: boolean;
}

export interface NotionConfig {
  databaseId: string;
  enabled: boolean;
  workspaceField: string;
  titleField: string;
  categoryField: string;
  priorityField: string;
  notesField: string;
}

export interface ClaudeConfig {
  enabled: boolean;
  model: string;
  maxTokens: number;
  systemPrompt: string;
}

export interface AutomationConfig {
  sheet: SourceConfig;
  notion: NotionConfig;
  claude: ClaudeConfig;
  scheduleMinutes: number;
}

export interface NotionContextItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  notes: string;
}

export interface AutomationStatus {
  mode: "demo" | "live";
  scheduleMinutes: number;
  lastRunState: "idle" | "running" | "success" | "failed";
  lastSheetsSyncAt: string | null;
  lastNotionSyncAt: string | null;
  lastClaudeRunAt: string | null;
  notionItems: number;
}

export interface UploadValidationResult {
  validRows: number;
  skippedRows: number;
  errors: string[];
}

export interface NormalizedRow {
  date: string;
  sku: string;
  product_name: string;
  category: string;
  brand: string;
  channel: string;
  sales_qty: number;
  sales_amount: number;
  returns_qty: number;
  inventory_on_hand: number;
  cost_amount: number;
  discount_amount: number;
}

export interface AutomationRunResponse {
  ok: boolean;
  status: AutomationStatus;
  notionItems: NotionContextItem[];
}

export interface NdaWorkflowResponse {
  ok: boolean;
  dashboard: DashboardPayload;
  packet: FilledNdaPacket;
}
