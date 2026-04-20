import {
  ActionItem,
  AutomationConfig,
  AutomationStatus,
  BrandProfile,
  CategoryBreakdown,
  DashboardPayload,
  EmailUpdate,
  FilledNdaPacket,
  KpiMetric,
  LegalQueueItem,
  NormalizedRow,
  NotionContextItem,
  PerformanceRow,
  SourceConfig,
  TrendPoint
} from "../types/domain";

export const defaultSourceConfig: SourceConfig = {
  sheetId: "1J0zCJYMLfTMwaUxECAzd5EVvhgSqQjkOBERNleUJAVg",
  tabName: "Beauty Tracker P",
  range: "A1:AH220",
  enabled: true
};

export const defaultAutomationConfig: AutomationConfig = {
  sheet: defaultSourceConfig,
  notion: {
    databaseId: "beauty-tracker-manager-context",
    enabled: true,
    workspaceField: "Workspace",
    titleField: "Title",
    categoryField: "Category",
    priorityField: "Priority",
    notesField: "Notes"
  },
  claude: {
    enabled: true,
    model: "claude-3-5-sonnet-latest",
    maxTokens: 900,
    systemPrompt:
      "You are an executive business analyst for a beauty brand expansion tracker. Summarize pipeline movement, launch risk, stage bottlenecks, and next actions only from the supplied tracker data."
  },
  scheduleMinutes: 15
};

export const snapshotContextItems: NotionContextItem[] = [
  {
    id: "action-1",
    title: "Nudestix [SEA]",
    category: "Commercials",
    priority: "High",
    notes: "Brand has to send term sheet. Discussion 1 should be scheduled immediately."
  },
  {
    id: "action-2",
    title: "ELF",
    category: "MQL",
    priority: "Medium",
    notes: "Deck readiness and brand meeting are the next critical milestones."
  },
  {
    id: "action-3",
    title: "Indie Wild",
    category: "MQL",
    priority: "Medium",
    notes: "Proposal is due in the 10th-13th April window and should be kept warm."
  }
];

export const initialAutomationStatus: AutomationStatus = {
  mode: "live",
  scheduleMinutes: 15,
  lastRunState: "success",
  lastSheetsSyncAt: "2026-04-05T12:30:10.000Z",
  lastNotionSyncAt: "2026-04-05T12:30:10.000Z",
  lastClaudeRunAt: "2026-04-05T12:30:10.000Z",
  notionItems: snapshotContextItems.length
};

export const sheetRows: NormalizedRow[] = [];

export const liveSheetHeaders = [
  "BRAND",
  "CATEGORY",
  "SEGMENT",
  "COMPANY",
  "COUNTRY",
  "COUNTRY FOR LAUNCH",
  "DISCUSSION START DATE",
  "STATUS",
  "REASON IF ON HOLD",
  "PROGRESS",
  "FOLLOW UP ",
  "Working Days",
  "Next  Steps ",
  "MQL DATE",
  "SQL DATE",
  "COMMERCIALS",
  "OD DATE",
  "CONTRACT CLOSURE DATE"
];

export const trackerRows: PerformanceRow[] = [
  { brand: "Nudestix", category: "Makeup", segment: "Premium", company: "Nudestix", sourceCountry: "Canada", launchMarket: "SEA", status: "Commercials", workingDays: 43, progress: 92, nextStep: "Term sheet follow-up", followUpStatus: "FOLLOW UP", warning: "TBD", leadToMqlDays: 21, mqlToSqlDays: 15, sqlToCommercialsDays: 4, commercialsToOdDays: 3 },
  { brand: "Nudestix", category: "Makeup", segment: "Premium", company: "Nudestix", sourceCountry: "Canada", launchMarket: "India", status: "Hold", workingDays: 35, progress: 24, nextStep: "Review regional sequencing", followUpStatus: "DONE", holdReason: "Want to start with one region", warning: "ON HOLD", leadToMqlDays: 23, mqlToSqlDays: 12 },
  { brand: "Nudestix", category: "Makeup", segment: "Premium", company: "Nudestix", sourceCountry: "Canada", launchMarket: "GCC", status: "Hold", workingDays: 36, progress: 24, nextStep: "OD and P&L review", followUpStatus: "DONE", holdReason: "Want to start with one region", warning: "ON HOLD", leadToMqlDays: 18, mqlToSqlDays: 18 },
  { brand: "Ajmal", category: "Perfumes", segment: "Masstige", company: "Ajmal", sourceCountry: "India", launchMarket: "SEA", status: "Hold", workingDays: 0, progress: 24, nextStep: "Brand restructuring update", followUpStatus: "DONE", holdReason: "Brand restructuring", warning: "ON HOLD" },
  { brand: "Ajmal", category: "Perfumes", segment: "Masstige", company: "Ajmal", sourceCountry: "India", launchMarket: "India", quadrant: "1B", status: "Hold", workingDays: 0, progress: 24, nextStep: "Brand restructuring update", followUpStatus: "DONE", holdReason: "Brand restructuring", warning: "ON HOLD" },
  { brand: "Ajmal", category: "Perfumes", segment: "Masstige", company: "Ajmal", sourceCountry: "India", launchMarket: "GCC", quadrant: "1B", status: "Hold", workingDays: 0, progress: 24, nextStep: "Brand restructuring update", followUpStatus: "DONE", holdReason: "Brand restructuring", warning: "ON HOLD" },
  { brand: "Toni & Guy", category: "Haircare", segment: "Masstige", company: "Reliance", sourceCountry: "London", launchMarket: "India", quadrant: "1B", status: "Hold", workingDays: 0, progress: 24, nextStep: "No response follow-up", followUpStatus: "DONE", holdReason: "No response", warning: "ON HOLD" },
  { brand: "Brylcreem", category: "Haircare", segment: "Masstige", company: "Reliance", sourceCountry: "London", launchMarket: "India", quadrant: "1B", status: "Hold", workingDays: 0, progress: 24, nextStep: "No response follow-up", followUpStatus: "DONE", holdReason: "No response", warning: "ON HOLD" },
  { brand: "Elf Beauty", category: "Makeup", segment: "Masstige", company: "Elf Cosmetics", sourceCountry: "California", launchMarket: "Under Discussion", status: "MQL", workingDays: 22, progress: 56, nextStep: "Palak - NDA", followUpStatus: "FOLLOW UP", warning: "TBD", leadToMqlDays: 21, mqlToSqlDays: 1 },
  { brand: "Pixi", category: "Makeup", segment: "Premium", company: "Pixi", sourceCountry: "London", launchMarket: "Under Discussion", status: "MQL", workingDays: 22, progress: 56, nextStep: "Presentation", followUpStatus: "FOLLOW UP", warning: "TBD", leadToMqlDays: 3, mqlToSqlDays: 19 },
  { brand: "Anastasia Beverley Hills", category: "Makeup", segment: "Premium", company: "Anastasia Beverley Hills", sourceCountry: "USA", launchMarket: "SEA", status: "MQL", workingDays: 25, progress: 56, nextStep: "Term sheet - Pooja", followUpStatus: "FOLLOW UP", warning: "TBD", leadToMqlDays: 2, mqlToSqlDays: 23 },
  { brand: "Honasa", category: "Haircare & Skincare", segment: "Mass", company: "Honasa", sourceCountry: "India", launchMarket: "Under Discussion", quadrant: "1B", status: "MQL", workingDays: 0, progress: 56, nextStep: "Pitch deck - Richa", followUpStatus: "FOLLOW UP", warning: "TBD" },
  { brand: "Inde Wild", category: "Haircare", segment: "Masstige", company: "Inde Wild", sourceCountry: "India", launchMarket: "Under Discussion", quadrant: "1B", status: "MQL", workingDays: 35, progress: 56, nextStep: "Pitch deck - Richa", followUpStatus: "FOLLOW UP", warning: "TBD", leadToMqlDays: 18, mqlToSqlDays: 17 },
  { brand: "D'You", category: "Skincare", segment: "Premium", company: "D'You", sourceCountry: "India", launchMarket: "Under Discussion", quadrant: "1B", status: "MQL", workingDays: 0, progress: 56, nextStep: "Pitch deck - Richa", followUpStatus: "FOLLOW UP", warning: "TBD" },
  { brand: "Deconstruct", category: "Skincare", segment: "Mass", company: "Deconstruct", sourceCountry: "India", launchMarket: "Under Discussion", quadrant: "1B", status: "MQL", workingDays: 0, progress: 56, nextStep: "NDA workflow", followUpStatus: "FOLLOW UP", warning: "TBD" },
  { brand: "Paula's Choice", category: "Skincare", segment: "Premium", company: "Unilever", sourceCountry: "London", launchMarket: "Under Discussion", quadrant: "1B", status: "MQL", workingDays: 22, progress: 56, nextStep: "NDA - Pooja", followUpStatus: "FOLLOW UP", leadToMqlDays: 22 },
  { brand: "Maxiblock", category: "Sunscreen", segment: "Masstige", company: "Maxiblock", sourceCountry: "Australia", launchMarket: "Under Discussion", status: "Hold", workingDays: 0, progress: 24, nextStep: "Opportunity too small", followUpStatus: "DONE", holdReason: "Too small", warning: "ON HOLD" },
  { brand: "Yardley", category: "Perfumes", segment: "Masstige", company: "Wipro", sourceCountry: "India", launchMarket: "Under Discussion", status: "MQL", workingDays: 0, progress: 56, nextStep: "Pooja - CID", followUpStatus: "FOLLOW UP" },
  { brand: "Dermafora", category: "Skincare", segment: "Premium", company: "Dermafora", sourceCountry: "Switzerland", launchMarket: "Under Discussion", status: "Hold", workingDays: 0, progress: 24, nextStep: "Opportunity too small", followUpStatus: "DONE", holdReason: "Too small", warning: "ON HOLD" },
  { brand: "Sugar Cosmetics", category: "Makeup", segment: "Masstige", company: "Velvette", sourceCountry: "India", launchMarket: "Under Discussion", status: "Hold", workingDays: 0, progress: 24, nextStep: "Opportunity too small", followUpStatus: "DONE", holdReason: "Too small", warning: "ON HOLD" },
  { brand: "Love Child by Masaba", category: "Makeup", segment: "Masstige", company: "Masaba Gupta", sourceCountry: "India", launchMarket: "Under Discussion", status: "Hold", workingDays: 0, progress: 24, nextStep: "Opportunity too small", followUpStatus: "DONE", holdReason: "Too small", warning: "ON HOLD" },
  { brand: "Renee Cosmetics", category: "Makeup", segment: "Masstige", company: "Renee Cosmetics Pvt Ltd", sourceCountry: "India", launchMarket: "Under Discussion", status: "Hold", workingDays: 0, progress: 24, nextStep: "Opportunity too small", followUpStatus: "DONE", holdReason: "Too small", warning: "ON HOLD" },
  { brand: "Mars Cosmetics", category: "Makeup", segment: "Mass", company: "Mars Cosmetics", sourceCountry: "India", launchMarket: "Under Discussion", status: "Reject", workingDays: 0, progress: 8, nextStep: "Closed", followUpStatus: "DONE", holdReason: "Too small", warning: "REJECTED" },
  { brand: "Mor Boutique", category: "Skincare", segment: "Premium", company: "Mor Boutique", sourceCountry: "Australia", launchMarket: "India", status: "Reject", workingDays: 0, progress: 8, nextStep: "Terms not agreed", followUpStatus: "DONE", holdReason: "Terms not agreed", warning: "REJECTED" },
  { brand: "Beardo", category: "Mens' Grooming", segment: "Masstige", company: "Marico", sourceCountry: "India", launchMarket: "SEA", status: "MQL", workingDays: 1, progress: 56, nextStep: "Pitch deck - Richa", followUpStatus: "FOLLOW UP", leadToMqlDays: 1 },
  { brand: "Beardo", category: "Mens' Grooming", segment: "Masstige", company: "Marico", sourceCountry: "India", launchMarket: "GCC", status: "MQL", workingDays: 1, progress: 56, nextStep: "Pitch deck - Richa", followUpStatus: "FOLLOW UP" },
  { brand: "Just Herbs", category: "Skincare (Ayurveda)", segment: "Masstige", company: "Marico", sourceCountry: "India", launchMarket: "SEA", status: "MQL", workingDays: 1, progress: 56, nextStep: "Carry with Beardo", followUpStatus: "FOLLOW UP" },
  { brand: "Just Herbs", category: "Skincare (Ayurveda)", segment: "Masstige", company: "Marico", sourceCountry: "India", launchMarket: "GCC", status: "MQL", workingDays: 1, progress: 56, nextStep: "Carry with Beardo", followUpStatus: "FOLLOW UP" },
  { brand: "Oh so Heavenly", category: "Skincare", segment: "Mass", company: "Wipro", sourceCountry: "South Africa", launchMarket: "SEA", status: "Leads", workingDays: 0, progress: 34, nextStep: "Advance qualification", followUpStatus: "FOLLOW UP" },
  { brand: "Lancome", category: "Skincare", segment: "Premium", company: "LÓreal", sourceCountry: "India", launchMarket: "India", status: "Leads", workingDays: 0, progress: 34, nextStep: "Pooja - reminder", followUpStatus: "FOLLOW UP" },
  { brand: "YSL", category: "Perfumes", segment: "Premium", company: "LÓreal", sourceCountry: "India", launchMarket: "India", status: "Leads", workingDays: 0, progress: 34, nextStep: "Pooja - reminder", followUpStatus: "FOLLOW UP" },
  { brand: "US Polo", category: "Perfumes", segment: "Masstige", sourceCountry: "India", launchMarket: "India", status: "Leads", workingDays: 0, progress: 34, nextStep: "Qualify opportunity", followUpStatus: "FOLLOW UP" },
  { brand: "Azzaro", category: "Perfumes", segment: "Premium", sourceCountry: "India", launchMarket: "India", status: "Leads", workingDays: 0, progress: 34, nextStep: "Waiting for brand", followUpStatus: "FOLLOW UP" },
  { brand: "Jeanne Arthes", category: "Perfumes", segment: "Masstige", company: "BCPL", sourceCountry: "India", launchMarket: "India", status: "Leads", workingDays: 0, progress: 34, nextStep: "Richa - Research and confirm", followUpStatus: "ON TRACK" },
  { brand: "Solinotes", category: "Perfumes", segment: "Masstige", company: "BCPL", sourceCountry: "India", launchMarket: "India", status: "Leads", workingDays: 0, progress: 34, nextStep: "Richa - Research and confirm", followUpStatus: "ON TRACK" },
];

function countByStatus(status: string) {
  return trackerRows.filter((row) => row.status === status).length;
}

function averageWorkingDays(statuses?: string[]) {
  const rows = statuses
    ? trackerRows.filter((row) => statuses.includes(row.status))
    : trackerRows;
  if (rows.length === 0) {
    return 0;
  }
  const total = rows.reduce((sum, row) => sum + row.workingDays, 0);
  return Math.round(total / rows.length);
}

function buildCategoryMix(): CategoryBreakdown[] {
  const map = new Map<string, number>();
  for (const row of trackerRows) {
    map.set(row.category, (map.get(row.category) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([category, revenue]) => ({ category, revenue, inventoryValue: Math.max(1, Math.round(revenue / 2)) }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildMarketMix(): CategoryBreakdown[] {
  const map = new Map<string, number>();
  for (const row of trackerRows) {
    map.set(row.launchMarket, (map.get(row.launchMarket) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([category, revenue]) => ({ category, revenue, inventoryValue: Math.max(1, Math.round(revenue / 3)) }))
    .sort((a, b) => b.revenue - a.revenue);
}

const trackerTrend: TrendPoint[] = [
  { label: "New", primary: countByStatus("New"), secondary: averageWorkingDays(["New"]), tertiary: 0 },
  { label: "Leads", primary: countByStatus("Leads"), secondary: averageWorkingDays(["Leads"]), tertiary: 11 },
  { label: "MQL", primary: countByStatus("MQL"), secondary: averageWorkingDays(["MQL"]), tertiary: 19 },
  { label: "SQL", primary: countByStatus("SQL"), secondary: averageWorkingDays(["SQL"]), tertiary: 0 },
  { label: "Commercials", primary: countByStatus("Commercials"), secondary: averageWorkingDays(["Commercials"]), tertiary: 43 },
  { label: "Hold", primary: countByStatus("Hold"), secondary: averageWorkingDays(["Hold"]), tertiary: 12 },
  { label: "Reject", primary: countByStatus("Reject"), secondary: averageWorkingDays(["Reject"]), tertiary: 0 }
];

const trackerMetrics: KpiMetric[] = [
  {
    label: "Active Pipelines",
    value: String(trackerRows.length),
    delta: `↗ ${new Set(trackerRows.map((row) => row.brand)).size} brands`,
    tone: "blue",
    hint: "Brand-country opportunities currently tracked",
    detailTitle: "Active markets",
    detailItems: Array.from(new Set(trackerRows.map((row) => row.launchMarket)))
  },
  {
    label: "MQL Opportunities",
    value: String(countByStatus("MQL")),
    delta: `↗ ${Math.round((countByStatus("MQL") / trackerRows.length) * 100)}% of total`,
    tone: "green",
    hint: "Largest active stage in the pipeline",
    detailTitle: "Brands in MQL",
    detailItems: Array.from(new Set(trackerRows.filter((row) => row.status === "MQL").map((row) => row.brand)))
  },
  {
    label: "Commercials Live",
    value: String(countByStatus("Commercials")),
    delta: "↗ Nudestix SEA",
    tone: "purple",
    hint: "Closest opportunity to conversion",
    detailTitle: "Commercial rows",
    detailItems: trackerRows.filter((row) => row.status === "Commercials").map((row) => `${row.brand} · ${row.launchMarket}`)
  },
  {
    label: "Avg Working Days",
    value: String(averageWorkingDays(["Leads", "MQL", "Commercials", "Hold"])),
    delta: "↗ Across open rows",
    tone: "orange",
    hint: "Average age across active tracked opportunities",
    detailTitle: "Oldest rows",
    detailItems: [...trackerRows].sort((a, b) => b.workingDays - a.workingDays).slice(0, 5).map((row) => `${row.brand} · ${row.workingDays} days`)
  },
  {
    label: "On Hold",
    value: String(countByStatus("Hold")),
    delta: `↗ ${Math.round((countByStatus("Hold") / trackerRows.length) * 100)}% of tracker`,
    tone: "orange",
    hint: "Rows stalled by brand, region, or strategic constraints",
    detailTitle: "Hold reasons",
    detailItems: ["Regional sequencing", "Brand restructuring", "No response", "Too small"]
  },
  {
    label: "Rejected",
    value: String(countByStatus("Reject")),
    delta: "↗ Low leak",
    tone: "blue",
    hint: "Rows that exited the pipeline",
    detailTitle: "Rejected brands",
    detailItems: trackerRows.filter((row) => row.status === "Reject").map((row) => row.brand)
  }
];

export const liveLegalQueue: LegalQueueItem[] = [
  {
    id: "legal-deconstruct",
    brand: "Deconstruct",
    entityName: "Baypure Lifestyle Pvt Ltd",
    category: "Skincare",
    market: "India",
    stage: "NDA",
    owner: "Vishwas Pandey",
    ndaStatus: "Sent for legal review",
    termSheetStatus: "Not started",
    signatoryName: "Malini Adapureddy",
    signatoryTitle: "Founder & CEO",
    signatoryEmail: "malini@thedeconstruct.in",
    registeredAddress: "No. 8, K No3 Survey No. 16/ C.M.L/O, Yellukunte Village, Begur, Bangalore South, Bangalore, Karnataka, India, 560068.",
    lastEmailSummary:
      "Brand shared the legal entity, authorized signatory, designation, email, and the corrected registered address. The filled NDA was then sent to Palak for legal review.",
    requestedAction: "Use this thread as the trial completed flow for filling the NDA and routing it to legal.",
    templateName: "Opptra_NDA (1) (1).docx",
    templateSourceUrl: "https://docs.google.com/document/d/1rZWabrn3-U4F1ItPLC7RtCx2huTQGVFu/edit",
    templateStatus: "brand-specific draft",
    extractionConfidence: "high",
    sourceFields: [
      { label: "BRAND", value: "Deconstruct" },
      { label: "COUNTRY FOR LAUNCH", value: "India" },
      { label: "STATUS", value: "NDA" },
      { label: "Registered address", value: "No. 8, K No3 Survey No. 16/ C.M.L/O, Yellukunte Village, Begur, Bangalore South, Bangalore, Karnataka, India, 560068." }
    ]
  },
  {
    id: "legal-beardo",
    brand: "Beardo",
    entityName: "",
    category: "Mens Grooming",
    market: "SEA / GCC",
    stage: "NDA requested",
    owner: "Richa Gupta",
    ndaStatus: "Awaiting details",
    termSheetStatus: "Proposal pending working session",
    signatoryName: "",
    signatoryTitle: "",
    signatoryEmail: "",
    registeredAddress: "",
    lastEmailSummary:
      "Richa sent the NDA and requested the authorized signatory name, designation, email, and registered address. The latest reply says that once those details come in, the NDA can be finalized.",
    requestedAction: "Wait for Khusboo or the brand team to share signatory and address details, then prepare the NDA for legal.",
    templateName: "Opptra_NDA (1) (1).docx",
    templateSourceUrl: "https://docs.google.com/document/d/1rZWabrn3-U4F1ItPLC7RtCx2huTQGVFu/edit",
    templateStatus: "brand-specific draft",
    extractionConfidence: "medium",
    sourceFields: [
      { label: "BRAND", value: "Beardo" },
      { label: "COUNTRY FOR LAUNCH", value: "SEA / GCC" },
      { label: "STATUS", value: "Working session pending" },
      { label: "Next  Steps ", value: "Receive signatory details and schedule working session" }
    ]
  },
  {
    id: "legal-swiggy",
    brand: "Swiggy",
    entityName: "",
    category: "Quick Commerce",
    market: "India",
    stage: "NDA requested",
    owner: "Richa Gupta",
    ndaStatus: "Awaiting details",
    termSheetStatus: "Not started",
    signatoryName: "",
    signatoryTitle: "",
    signatoryEmail: "",
    registeredAddress: "",
    lastEmailSummary:
      "The Swiggy thread includes the standard NDA request and asks for authorized signatory details plus the registered address before the DocuSign step can begin.",
    requestedAction: "Follow up for signatory details and registered address before preparing the filled NDA.",
    templateName: "Opptra_NDA (1) (1).docx",
    templateSourceUrl: "https://docs.google.com/document/d/1rZWabrn3-U4F1ItPLC7RtCx2huTQGVFu/edit",
    templateStatus: "brand-specific draft",
    extractionConfidence: "medium",
    sourceFields: [
      { label: "BRAND", value: "Swiggy" },
      { label: "COUNTRY FOR LAUNCH", value: "India" },
      { label: "STATUS", value: "NDA requested" },
      { label: "Next  Steps ", value: "Receive signatory details from Atul or Ruchika" }
    ]
  }
];

export const liveNdaPacket: FilledNdaPacket = {
  brandId: "legal-deconstruct",
  brand: "Deconstruct",
  recipientName: "Palak Legal Review",
  recipientEmail: "vishwas@opptra.com",
  subject: "Filled NDA packet review: Deconstruct | India",
  body: [
    "Hi Palak,",
    "",
    "Please review the filled NDA packet for Deconstruct.",
    "",
    "Brand: Deconstruct",
    "Entity: Baypure Lifestyle Pvt Ltd",
    "Launch market: India",
    "Authorized signatory: Malini Adapureddy",
    "Signatory title: Founder & CEO",
    "Signatory email: malini@thedeconstruct.in",
    "Registered address: No. 8, K No3 Survey No. 16/ C.M.L/O, Yellukunte Village, Begur, Bangalore South, Bangalore, Karnataka, India, 560068.",
    "Current stage: NDA",
    "Next step: Legal review and DocuSign send",
    "",
    "Latest context from the brand:",
    "Brand shared the legal entity, signatory details, and corrected registered address. The packet was then routed to Palak.",
    "",
    "Please confirm once reviewed.",
    "",
    "Thanks"
  ].join("\n"),
  attachmentName: "Deconstruct_Opptra_NDA_draft.pdf",
  preparedAt: "2026-04-06T10:25:00.000Z",
  sentAt: "2026-03-25T13:29:49.000Z",
  status: "sent",
  missingFields: [],
  readyForReview: true,
  readyToSend: true,
  sourceDocumentUrl: "https://docs.google.com/document/d/1rZWabrn3-U4F1ItPLC7RtCx2huTQGVFu/edit",
  generatedDocumentType: "review-html",
  filledFields: [
    { label: "Brand", value: "Deconstruct" },
    { label: "Entity name", value: "Baypure Lifestyle Pvt Ltd" },
    { label: "Launch market", value: "India" },
    { label: "Authorized signatory", value: "Malini Adapureddy" },
    { label: "Signatory title", value: "Founder & CEO" },
    { label: "Signatory email", value: "malini@thedeconstruct.in" },
    {
      label: "Registered address",
      value: "No. 8, K No3 Survey No. 16/ C.M.L/O, Yellukunte Village, Begur, Bangalore South, Bangalore, Karnataka, India, 560068."
    }
  ]
};

export const liveInboxUpdates: EmailUpdate[] = [
  {
    id: "mail-beardo-latest",
    brand: "Beardo",
    subject: "Re: Opptra X International business",
    sender: "Ankit Mittal",
    timestamp: "2026-04-06T12:49:35.000Z",
    status: "unread",
    summary:
      "Ankit shared the Beardo and Just Herbs brand deck link. The earlier thread still requires authorized signatory details to finalize the NDA.",
    actionNeeded: "Review deck and follow up for authorized signatory details."
  },
  {
    id: "mail-deconstruct-legal",
    brand: "Deconstruct",
    subject: "Re: Deconstruct*Opptra : NDA & Form",
    sender: "Palak Jhalani",
    timestamp: "2026-03-25T13:11:13.000Z",
    status: "done",
    summary:
      "Palak confirmed she needed the registered address and preferred that the brand details be filled in before sending. The corrected address was then shared and the NDA was completed.",
    actionNeeded: "Keep as the benchmark legal workflow example."
  },
  {
    id: "mail-swiggy-nda",
    brand: "Swiggy",
    subject: "Swiggy*Opptra",
    sender: "Richa Gupta",
    timestamp: "2026-03-27T05:51:24.000Z",
    status: "waiting",
    summary:
      "Richa sent the standard NDA and requested authorized signatory details plus registered address before DocuSign can begin.",
    actionNeeded: "Follow up with Atul or Ruchika for signatory details."
  },
  {
    id: "mail-nudestix-terms",
    brand: "Nudestix",
    subject: "Fwd: Nudestix x Opptra - SEA opportunity",
    sender: "Richa Gupta",
    timestamp: "2026-03-26T05:46:02.000Z",
    status: "waiting",
    summary:
      "Nudestix shared updated term sheets and asked Opptra to confirm the correct commercial path before aligning on the next steps.",
    actionNeeded: "Review term sheet and lock the next commercial discussion."
  }
];

export const liveActionItems: ActionItem[] = [
  {
    id: "action-beardo-signatory",
    brand: "Beardo",
    owner: "Vishwas Pandey",
    title: "Collect authorized signatory details for NDA",
    dueLabel: "Today",
    priority: "high",
    status: "open",
    source: "email"
  },
  {
    id: "action-beardo-session",
    brand: "Beardo",
    owner: "Richa Gupta",
    title: "Confirm working session slot before proposal",
    dueLabel: "This week",
    priority: "high",
    status: "in-progress",
    source: "meeting"
  },
  {
    id: "action-swiggy-followup",
    brand: "Swiggy",
    owner: "Vishwas Pandey",
    title: "Follow up for signatory details and registered address",
    dueLabel: "Tomorrow",
    priority: "medium",
    status: "waiting",
    source: "legal"
  },
  {
    id: "action-nudestix-terms",
    brand: "Nudestix",
    owner: "Pooja Sodhi",
    title: "Review term sheet and agree commercial path",
    dueLabel: "This week",
    priority: "high",
    status: "open",
    source: "email"
  },
  {
    id: "action-deconstruct-template",
    brand: "Deconstruct",
    owner: "Vishwas Pandey",
    title: "Convert completed NDA into reusable template placeholders",
    dueLabel: "Next",
    priority: "medium",
    status: "open",
    source: "legal"
  }
];

const trackerBrandProfiles: BrandProfile[] = [
  {
    id: "brand-nudestix",
    brand: "Nudestix",
    market: "SEA / India / GCC",
    stage: "Commercials / Hold",
    owner: "Pooja Sodhi",
    category: "Makeup",
    summary: "Tracker contains live SEA commercials movement with India and GCC held due to launch-region sequencing.",
    nextStep: "Review term sheet and unlock the correct region path.",
    legalStatus: "Commercial terms active",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: ["Christopher Taylor", "Jenny Frankel"],
    documents: []
  },
  {
    id: "brand-ajmal",
    brand: "Ajmal",
    market: "SEA / India / GCC",
    stage: "Hold",
    owner: "Afshan",
    category: "Perfumes",
    summary: "All three tracker rows are paused because of brand restructuring.",
    nextStep: "Recheck brand restructuring status before reviving discussion.",
    legalStatus: "Not active",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-toni-and-guy",
    brand: "Toni & Guy",
    market: "India",
    stage: "Hold",
    owner: "Richa Gupta",
    category: "Haircare",
    summary: "Tracker shows no response and the opportunity is paused.",
    nextStep: "Decide whether to follow up again or close out.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-brylcreem",
    brand: "Brylcreem",
    market: "India",
    stage: "Hold",
    owner: "Richa Gupta",
    category: "Haircare",
    summary: "Tracker shows no response and the row remains on hold.",
    nextStep: "Review whether this should stay paused or move to reject.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-elf-beauty",
    brand: "Elf Beauty",
    market: "Under Discussion",
    stage: "MQL",
    owner: "Richa Gupta",
    category: "Makeup",
    summary: "The tracker shows Elf in active qualification with NDA follow-up noted.",
    nextStep: "Move NDA and deck readiness forward.",
    legalStatus: "NDA follow-up noted",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-pixi",
    brand: "Pixi",
    market: "Under Discussion",
    stage: "MQL",
    owner: "Richa Gupta",
    category: "Makeup",
    summary: "Pixi remains in MQL stage in the tracker with follow-up active.",
    nextStep: "Keep qualification warm and move toward proposal.",
    legalStatus: "Not active",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-anastasia-beverley-hills",
    brand: "Anastasia Beverley Hills",
    market: "SEA",
    stage: "MQL",
    owner: "Richa Gupta",
    category: "Makeup",
    summary: "The tracker has Anastasia in MQL with a term-sheet reminder against the row.",
    nextStep: "Advance term sheet discussion with Pooja.",
    legalStatus: "Commercial prep",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-honasa",
    brand: "Honasa",
    market: "Under Discussion",
    stage: "MQL",
    owner: "Richa Gupta",
    category: "Haircare & Skincare",
    summary: "Honasa is in MQL with a pitch deck note attached in the tracker.",
    nextStep: "Push the pitch deck review forward.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-inde-wild",
    brand: "Inde Wild",
    market: "Under Discussion",
    stage: "MQL",
    owner: "Richa Gupta",
    category: "Haircare",
    summary: "Inde Wild is actively qualified and the row calls out pitch-deck movement.",
    nextStep: "Move from pitch deck into proposal.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-dyou",
    brand: "D'You",
    market: "Under Discussion",
    stage: "MQL",
    owner: "Richa Gupta",
    category: "Skincare",
    summary: "The tracker keeps D'You in MQL with pitch-deck follow-up still open.",
    nextStep: "Keep the pitch deck moving and confirm seriousness.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-paulas-choice",
    brand: "Paula's Choice",
    market: "Under Discussion",
    stage: "Lead / MQL prep",
    owner: "Pooja Sodhi",
    category: "Skincare",
    summary: "The tracker shows a lead-stage row with NDA follow-up in the notes.",
    nextStep: "Move NDA and qualification forward.",
    legalStatus: "NDA noted",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-maxiblock",
    brand: "Maxiblock",
    market: "Under Discussion",
    stage: "Hold",
    owner: "Team",
    category: "Sunscreen",
    summary: "Tracker shows the opportunity paused due to size concerns.",
    nextStep: "Review whether the opportunity should remain paused.",
    legalStatus: "Not active",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-yardley",
    brand: "Yardley",
    market: "Under Discussion",
    stage: "Lead / MQL prep",
    owner: "Pooja Sodhi",
    category: "Perfumes",
    summary: "Lead-stage row with CID follow-up note in the tracker.",
    nextStep: "Advance qualification and CID follow-up.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-dermafora",
    brand: "Dermafora",
    market: "Under Discussion",
    stage: "Hold",
    owner: "Team",
    category: "Skincare",
    summary: "Paused because the opportunity was considered too small.",
    nextStep: "Keep parked unless economics improve.",
    legalStatus: "Not active",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-sugar-cosmetics",
    brand: "Sugar Cosmetics",
    market: "Under Discussion",
    stage: "Hold",
    owner: "Team",
    category: "Makeup",
    summary: "Paused due to small opportunity size.",
    nextStep: "Re-evaluate only if strategic value improves.",
    legalStatus: "Not active",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-love-child-by-masaba",
    brand: "Love Child by Masaba",
    market: "Under Discussion",
    stage: "Hold",
    owner: "Team",
    category: "Makeup",
    summary: "Paused in tracker because the opportunity is too small right now.",
    nextStep: "Leave parked unless conditions change.",
    legalStatus: "Not active",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-renee-cosmetics",
    brand: "Renee Cosmetics",
    market: "Under Discussion",
    stage: "Hold",
    owner: "Team",
    category: "Makeup",
    summary: "Paused due to limited opportunity size.",
    nextStep: "Review later if economics change.",
    legalStatus: "Not active",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-mars-cosmetics",
    brand: "Mars Cosmetics",
    market: "Under Discussion",
    stage: "Reject",
    owner: "Team",
    category: "Makeup",
    summary: "Rejected in tracker due to small opportunity size.",
    nextStep: "Closed.",
    legalStatus: "Closed",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-mor-boutique",
    brand: "Mor Boutique",
    market: "India",
    stage: "Reject",
    owner: "Team",
    category: "Skincare",
    summary: "Closed in tracker because terms were not agreed.",
    nextStep: "Closed.",
    legalStatus: "Closed",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-beardo",
    brand: "Beardo",
    market: "SEA / GCC",
    stage: "MQL",
    owner: "Richa Gupta",
    category: "Mens Grooming",
    summary: "Commercial conversation is active. The brand deck has been shared, the proposal is gated on a working session, and NDA signatory details are still pending.",
    nextStep: "Get signatory details and confirm the working session.",
    legalStatus: "NDA requested, details pending",
    lastUpdate: "2026-04-06T12:49:35.000Z",
    keyContacts: ["Ankit Mittal", "Siddhartha Roy", "Khusboo Nehru"],
    documents: [
      { id: "doc-beardo-nda", title: "Opptra NDA draft", kind: "nda", status: "Sent, awaiting details" },
      { id: "doc-beardo-deck", title: "Beardo / Just Herbs deck link", kind: "deck", status: "Received" }
    ]
  },
  {
    id: "brand-just-herbs",
    brand: "Just Herbs",
    market: "SEA / GCC",
    stage: "MQL",
    owner: "Richa Gupta",
    category: "Skincare (Ayurveda)",
    summary: "Tracker shows Just Herbs in active qualification alongside the Beardo thread.",
    nextStep: "Carry forward qualification under the same brand-family conversation.",
    legalStatus: "Dependent on shared NDA clarification",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-oh-so-heavenly",
    brand: "Oh so Heavenly",
    market: "SEA",
    stage: "Leads",
    owner: "Team",
    category: "Skincare",
    summary: "New lead-stage row in the tracker.",
    nextStep: "Advance qualification.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-lancome",
    brand: "Lancome",
    market: "India",
    stage: "Leads",
    owner: "Pooja Sodhi",
    category: "Skincare",
    summary: "Lead-stage tracker row with reminder note attached.",
    nextStep: "Follow the reminder and confirm appetite.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-ysl",
    brand: "YSL",
    market: "India",
    stage: "Leads",
    owner: "Pooja Sodhi",
    category: "Perfumes",
    summary: "New lead row with reminder note in the tracker.",
    nextStep: "Advance from lead into active qualification.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-us-polo",
    brand: "US Polo",
    market: "India",
    stage: "Leads",
    owner: "Team",
    category: "Perfumes",
    summary: "Lead-stage tracker row with no deeper movement yet.",
    nextStep: "Qualify the opportunity.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-azzaro",
    brand: "Azzaro",
    market: "India",
    stage: "Leads",
    owner: "Team",
    category: "Perfumes",
    summary: "Lead-stage row with note that the team spoke to Nishit and is waiting for the brand.",
    nextStep: "Wait for brand response and keep the lead warm.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: ["Nishit"],
    documents: []
  },
  {
    id: "brand-jeanne-arthes",
    brand: "Jeanne Arthes",
    market: "India",
    stage: "Leads",
    owner: "Richa Gupta",
    category: "Perfumes",
    summary: "Lead-stage row with research and confirmation task assigned to Richa.",
    nextStep: "Complete research and confirm go-forward view.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-solinotes",
    brand: "Solinotes",
    market: "India",
    stage: "Leads",
    owner: "Richa Gupta",
    category: "Perfumes",
    summary: "Lead-stage row with research and confirmation task assigned to Richa.",
    nextStep: "Complete research and confirm direction.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  },
  {
    id: "brand-giordano",
    brand: "Giordano",
    market: "SEA",
    stage: "New",
    owner: "Team",
    category: "Unassigned",
    summary: "New tracker entry with samples, quality, and research noted for GCC and SEA.",
    nextStep: "Clarify market scope and complete research.",
    legalStatus: "Not started",
    lastUpdate: "2026-04-02T12:30:10.000Z",
    keyContacts: [],
    documents: []
  }
];

const detailedBrandOverrides: BrandProfile[] = [
  {
    id: "brand-deconstruct",
    brand: "Deconstruct",
    market: "India",
    stage: "NDA completed",
    owner: "Vishwas Pandey",
    category: "Skincare",
    summary:
      "This is the cleanest completed NDA example in the mailbox, including signatory details, registered address correction, and Palak handoff.",
    nextStep: "Use as the standard operating workflow for future NDA automation.",
    legalStatus: "Sent to legal and filled",
    lastUpdate: "2026-03-25T13:29:49.000Z",
    keyContacts: ["Himangshu Hatimuria", "Malini Adapureddy", "Palak Jhalani"],
    documents: [
      {
        id: "doc-deconstruct-nda",
        title: "Opptra_NDA (1) (1).docx",
        kind: "nda",
        status: "Completed example",
        url: "https://docs.google.com/document/d/1rZWabrn3-U4F1ItPLC7RtCx2huTQGVFu/edit"
      }
    ]
  },
  {
    id: "brand-swiggy",
    brand: "Swiggy",
    market: "India",
    stage: "NDA requested",
    owner: "Richa Gupta",
    category: "Quick Commerce",
    summary:
      "The NDA has been sent to the business team, but signatory details and registered address are still missing, so legal cannot move yet.",
    nextStep: "Follow up for signatory details from the brand team.",
    legalStatus: "Waiting for brand details",
    lastUpdate: "2026-03-27T05:51:24.000Z",
    keyContacts: ["Atul Handa", "Ruchika Rohilla"],
    documents: [{ id: "doc-swiggy-nda", title: "Opptra NDA draft", kind: "nda", status: "Sent, awaiting details" }]
  },
  {
    id: "brand-nudestix",
    brand: "Nudestix",
    market: "SEA",
    stage: "Commercial review",
    owner: "Pooja Sodhi",
    category: "Makeup",
    summary:
      "The current movement is more commercial than legal. Updated term sheets were shared and the next decision is around the correct commercial model and path forward.",
    nextStep: "Review term sheet and align on the next commercial call.",
    legalStatus: "Not primary blocker",
    lastUpdate: "2026-03-26T05:46:02.000Z",
    keyContacts: ["Christopher Taylor", "Jenny Frankel"],
    documents: [
      { id: "doc-nudestix-term-digital", title: "Term Sheet-Beauty-Nudestix.3.25 Digital Only.docx", kind: "term-sheet", status: "Received" },
      { id: "doc-nudestix-term-full", title: "Term Sheet-Beauty-Nudestix.3.25.docx", kind: "term-sheet", status: "Received" },
      {
        id: "doc-nudestix-report",
        title: "Nudestix Southeast Asia (SEA) Market Expansion & GTM Strategy Report",
        kind: "report",
        status: "Available",
        url: "https://docs.google.com/document/d/1_vKvObQmG-GJWz04liueqnHiF-LD_qZ7HCd8NXsvP4w"
      }
    ]
  }
];

const overrideMap = new Map(detailedBrandOverrides.map((profile) => [profile.brand, profile]));

export const liveBrandProfiles: BrandProfile[] = [
  ...trackerBrandProfiles.filter((profile) => !overrideMap.has(profile.brand)),
  ...detailedBrandOverrides
].sort((left, right) => left.brand.localeCompare(right.brand));

export const liveDashboard: DashboardPayload = {
  generatedAt: "2026-04-06T10:20:00.000Z",
  lastSyncedAt: "2026-04-05T12:30:10.000Z",
  sourceStatus: "live",
  audit: {
    rawBrandRows: 37,
    cleanOpportunityRows: 35,
    placeholderRows: 2,
    rawUniqueBrands: 31,
    cleanUniqueBrands: 29
  },
  automation: initialAutomationStatus,
  sheetHeaders: liveSheetHeaders,
  notionContext: snapshotContextItems,
  metrics: trackerMetrics,
  alerts: [
    {
      id: "alert-1",
      tone: "warning",
      title: "Qualification is building faster than conversion",
      detail: "Mid-funnel momentum is healthy, but handoff into later commercial stages remains limited."
    },
    {
      id: "alert-2",
      tone: "danger",
      title: "Paused opportunity share is elevated",
      detail: "A meaningful share of the portfolio is delayed by strategy, sequencing, or opportunity-size concerns."
    },
    {
      id: "alert-3",
      tone: "warning",
      title: "Current NDA file is still a brand-specific draft",
      detail:
        "The Drive file contains Deconstruct party details, so legal should convert it into a reusable placeholder template before any live automated send."
    }
  ],
  trend: trackerTrend,
  performance: trackerRows,
  categoryMix: buildCategoryMix(),
  inventoryHealth: buildMarketMix(),
  insights: [
    {
      id: "insight-1",
      title: "Most opportunities are still in the middle of the process",
      summary: "There is healthy movement in the active pipeline, but only a small number of opportunities are close to conversion.",
      priority: "high"
    },
    {
      id: "insight-2",
      title: "Makeup and skincare have the highest activity",
      summary: "These categories make up most of the current opportunity base and deserve the most attention in planning and review.",
      priority: "medium"
    },
    {
      id: "insight-3",
      title: "A few paused opportunities need a clear decision",
      summary: "The hold list is large enough that reviewing which items to revive or close would improve focus.",
      priority: "medium"
    }
  ],
  legalQueue: liveLegalQueue,
  activeNdaPacket: liveNdaPacket,
  inboxUpdates: liveInboxUpdates,
  actionItems: liveActionItems,
  brandProfiles: liveBrandProfiles
};
