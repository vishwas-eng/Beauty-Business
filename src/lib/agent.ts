import { AgentResponse, BrandProfile, DashboardPayload, PerformanceRow } from "../types/domain";

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesAny(text: string, tokens: string[]) {
  return tokens.some((token) => text.includes(token));
}

function formatRow(row: PerformanceRow) {
  return {
    brand: row.brand,
    market: row.launchMarket,
    stage: row.status,
    category: row.category,
    nextStep: row.nextStep,
    summary: `${row.brand} is in ${row.status} for ${row.launchMarket}. Next step: ${row.nextStep}.`
  };
}

function uniqueRows(rows: PerformanceRow[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.brand}-${row.launchMarket}-${row.status}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function uniqueBrandCount(rows: PerformanceRow[]) {
  return new Set(rows.map((row) => row.brand)).size;
}

function getTopValues(rows: PerformanceRow[], selector: (row: PerformanceRow) => string, limit = 3) {
  return Array.from(
    rows.reduce((map, row) => {
      const key = selector(row) || "Unknown";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>())
  )
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit);
}

function buildSuggestionList(items: string[]) {
  return items.filter(Boolean).slice(0, 4);
}

function matchBrands(payload: DashboardPayload, text: string) {
  const normalizedQuery = normalize(text);
  return payload.brandProfiles.filter((profile) => {
    const brandTokens = normalize(profile.brand);
    return normalizedQuery.includes(brandTokens);
  });
}

function buildBrandAnswer(payload: DashboardPayload, profile: BrandProfile, query: string): AgentResponse {
  const trackerRows = payload.performance.filter((row) => row.brand === profile.brand);
  const inboxRows = payload.inboxUpdates.filter((row) => row.brand === profile.brand);
  const legalRow = payload.legalQueue.find((row) => row.brand === profile.brand);
  const actionRows = payload.actionItems.filter((row) => row.brand === profile.brand);
  const documentRows = profile.documents;

  const rows = [
    ...uniqueRows(trackerRows).map((row) => ({
      brand: row.brand,
      market: row.launchMarket,
      stage: row.status,
      category: row.category,
      nextStep: row.nextStep,
      summary: `${row.launchMarket} · ${row.status} · ${row.nextStep}`
    })),
    ...documentRows.slice(0, 2).map((document) => ({
      brand: profile.brand,
      stage: document.kind,
      nextStep: document.status,
      summary: document.title
    })),
    ...(legalRow
      ? [
          {
            brand: legalRow.brand,
            market: legalRow.market,
            stage: legalRow.stage,
            ndaStatus: legalRow.ndaStatus,
            nextStep: legalRow.requestedAction,
            summary: legalRow.lastEmailSummary
          }
        ]
      : []),
    ...inboxRows.slice(0, 1).map((mail) => ({
      brand: mail.brand,
      owner: mail.sender,
      stage: mail.status,
      nextStep: mail.actionNeeded,
      summary: mail.summary
    })),
    ...actionRows.slice(0, 1).map((item) => ({
      brand: item.brand,
      owner: item.owner,
      stage: item.status,
      nextStep: item.title,
      summary: `${item.title} · due ${item.dueLabel}`
    }))
  ].slice(0, 6);

  const answerParts = [
    `${profile.brand} is currently in ${profile.stage.toLowerCase()} for ${profile.market}.`,
    profile.summary,
    `Next step: ${profile.nextStep}.`
  ];

  if (legalRow) {
    answerParts.push(`Legal status: ${legalRow.ndaStatus}.`);
  }

  if (documentRows.some((document) => document.kind === "term-sheet")) {
    answerParts.push("Term-sheet material is linked on this brand record.");
  }

  if (inboxRows[0]) {
    answerParts.push(`Latest mail signal: ${inboxRows[0].summary}`);
  }

  return {
    ok: true,
    query,
    answer: answerParts.join(" "),
    sqlPreview: `SELECT * FROM brand_360 WHERE brand = '${profile.brand.replace(/'/g, "''")}';`,
    resultType: "overview",
    rows,
    suggestions: [
      `Show ${profile.brand} documents`,
      `What is the legal status for ${profile.brand}?`,
      `What should happen next for ${profile.brand}?`
    ]
  };
}

function filterByDimension(payload: DashboardPayload, text: string) {
  const markets = Array.from(new Set(payload.performance.map((row) => row.launchMarket)));
  const categories = Array.from(new Set(payload.performance.map((row) => row.category)));
  const segments = Array.from(new Set(payload.performance.map((row) => row.segment).filter(Boolean))) as string[];
  const sourceCountries = Array.from(new Set(payload.performance.map((row) => row.sourceCountry).filter(Boolean))) as string[];

  const matchedMarket = markets.find((market) => normalize(text).includes(normalize(market)));
  const matchedCategory = categories.find((category) => normalize(text).includes(normalize(category)));
  const matchedSegment = segments.find((segment) => normalize(text).includes(normalize(segment)));
  const matchedSourceCountry = sourceCountries.find((country) => normalize(text).includes(normalize(country)));

  let rows = payload.performance;
  const filters: string[] = [];

  if (matchedMarket) {
    rows = rows.filter((row) => row.launchMarket === matchedMarket);
    filters.push(`launch_market = '${matchedMarket.replace(/'/g, "''")}'`);
  }

  if (matchedCategory) {
    rows = rows.filter((row) => row.category === matchedCategory);
    filters.push(`category = '${matchedCategory.replace(/'/g, "''")}'`);
  }

  if (matchedSegment) {
    rows = rows.filter((row) => row.segment === matchedSegment);
    filters.push(`segment = '${matchedSegment.replace(/'/g, "''")}'`);
  }

  if (matchedSourceCountry) {
    rows = rows.filter((row) => row.sourceCountry === matchedSourceCountry);
    filters.push(`source_country = '${matchedSourceCountry.replace(/'/g, "''")}'`);
  }

  return {
    matchedMarket,
    matchedCategory,
    matchedSegment,
    matchedSourceCountry,
    rows,
    sqlPreview: `SELECT brand, category, launch_market, status, next_step FROM opportunities${
      filters.length ? ` WHERE ${filters.join(" AND ")}` : ""
    };`
  };
}

function buildDimensionAnswer(payload: DashboardPayload, query: string, text: string): AgentResponse {
  const dimensionResult = filterByDimension(payload, text);
  let rows = dimensionResult.rows;
  let stageToken = "";

  const stageMatchers = ["commercials", "mql", "sql", "leads", "lead", "new", "hold", "reject"];
  const stageMatch = stageMatchers.find((token) => text.includes(token));
  if (stageMatch) {
    stageToken =
      stageMatch === "leads" || stageMatch === "lead"
        ? "Leads"
        : stageMatch === "commercials"
          ? "Commercials"
          : stageMatch.toUpperCase();
    if (stageMatch === "hold" || stageMatch === "reject" || stageMatch === "new") {
      stageToken = stageMatch.charAt(0).toUpperCase() + stageMatch.slice(1);
    }
    rows = rows.filter((row) => normalize(row.status) === normalize(stageToken));
  }

  const opportunityCount = rows.length;
  const brands = uniqueBrandCount(rows);
  const descriptor = [
    dimensionResult.matchedMarket,
    dimensionResult.matchedCategory,
    dimensionResult.matchedSegment,
    dimensionResult.matchedSourceCountry,
    stageToken
  ]
    .filter(Boolean)
    .join(" · ");

  const answer = includesAny(text, ["how many", "count", "number of"])
    ? includesAny(text, ["brand", "brands"])
      ? `${brands} brands match ${descriptor || "the current filter"}, covering ${opportunityCount} opportunities.`
      : `${opportunityCount} opportunities match ${descriptor || "the current filter"}, covering ${brands} brands.`
    : opportunityCount > 0
      ? `${opportunityCount} opportunities match ${descriptor || "your request"}, covering ${brands} brands. The biggest names in this slice are ${getTopValues(rows, (row) => row.brand)
          .map(([brand, count]) => `${brand} (${count})`)
          .join(", ")}.`
      : "No opportunities matched that request.";

  const sqlPreview = `${dimensionResult.sqlPreview.replace(/;$/, "")}${
    stageToken ? `${dimensionResult.sqlPreview.includes("WHERE") ? " AND" : " WHERE"} status = '${stageToken}'` : ""
  };`;

  return {
    ok: true,
    query,
    answer,
    sqlPreview,
    resultType: "opportunities",
    rows: uniqueRows(rows).map((row) => formatRow(row)).slice(0, 12),
    suggestions: buildSuggestionList([
      dimensionResult.matchedMarket ? `Show all brands in ${dimensionResult.matchedMarket}` : "Show all brands in SEA",
      dimensionResult.matchedCategory ? `Show all ${dimensionResult.matchedCategory} brands` : "Show all skincare brands",
      stageToken ? `Show all ${stageToken.toLowerCase()} opportunities` : "Show brands in MQL",
      "What should I focus on this week?"
    ])
  };
}

function buildPortfolioAnswer(payload: DashboardPayload, query: string, text: string): AgentResponse {
  const performance = payload.performance;
  const marketLeaders = getTopValues(performance, (row) => row.launchMarket, 3);
  const categoryLeaders = getTopValues(performance, (row) => row.category, 3);
  const segmentLeaders = getTopValues(performance, (row) => row.segment || "Unknown", 3);
  const holdRows = performance.filter((row) => row.status === "Hold");
  const lateStageRows = performance.filter((row) => ["Commercials", "OD", "Contract", "Onboarding"].includes(row.status));
  const oldestRows = [...performance]
    .filter((row) => row.status !== "Reject")
    .sort((left, right) => right.workingDays - left.workingDays)
    .slice(0, 5);

  let answer = `${performance.length} opportunities are currently tracked across ${uniqueBrandCount(performance)} brands. `;

  if (includesAny(text, ["market", "region", "country"])) {
    answer += `The biggest market concentrations are ${marketLeaders.map(([name, count]) => `${name} (${count})`).join(", ")}. `;
  } else if (includesAny(text, ["category", "categories"])) {
    answer += `The biggest category concentrations are ${categoryLeaders.map(([name, count]) => `${name} (${count})`).join(", ")}. `;
  } else if (includesAny(text, ["segment"])) {
    answer += `The portfolio mix is led by ${segmentLeaders.map(([name, count]) => `${name} (${count})`).join(", ")}. `;
  } else if (includesAny(text, ["brand", "brands", "portfolio", "business", "pipeline", "overall"])) {
    answer += `The largest market buckets are ${marketLeaders.map(([name, count]) => `${name} (${count})`).join(", ")} and the biggest categories are ${categoryLeaders
      .map(([name, count]) => `${name} (${count})`)
      .join(", ")}. `;
  }

  answer += `${holdRows.length} opportunities are on hold, while ${lateStageRows.length} are in late-stage progress. `;
  if (oldestRows.length) {
    answer += `The oldest active names are ${oldestRows.slice(0, 3).map((row) => `${row.brand} (${row.workingDays} days)`).join(", ")}.`;
  }

  return {
    ok: true,
    query,
    answer: answer.trim(),
    sqlPreview: "SELECT launch_market, category, segment, status, COUNT(*) FROM opportunities GROUP BY 1,2,3,4;",
    resultType: "insights",
    rows: oldestRows.map((row) => formatRow(row)).slice(0, 5),
    suggestions: buildSuggestionList([
      "Which market is most stuck?",
      "Which categories are strongest?",
      "Show brands on hold",
      "What should I focus on this week?"
    ])
  };
}

export function buildAgentContext(payload: DashboardPayload) {
  const performance = payload.performance;
  const statusCounts = getTopValues(performance, (row) => row.status, 20);
  const marketCounts = getTopValues(performance, (row) => row.launchMarket, 10);
  const categoryCounts = getTopValues(performance, (row) => row.category, 10);
  const segmentCounts = getTopValues(performance, (row) => row.segment || "Unknown", 10);
  const holdReasonCounts = getTopValues(
    performance.filter((row) => row.status === "Hold"),
    (row) => row.holdReason || "Unspecified",
    10
  );
  const staleOpportunities = [...performance]
    .filter((row) => row.status !== "Reject")
    .sort((left, right) => right.workingDays - left.workingDays)
    .slice(0, 10)
    .map((row) => ({
      brand: row.brand,
      market: row.launchMarket,
      status: row.status,
      category: row.category,
      workingDays: row.workingDays,
      nextStep: row.nextStep
    }));

  return {
    overview: {
      totalOpportunities: performance.length,
      uniqueBrands: uniqueBrandCount(performance),
      holdCount: performance.filter((row) => row.status === "Hold").length,
      lateStageCount: performance.filter((row) => ["Commercials", "OD", "Contract", "Onboarding"].includes(row.status)).length
    },
    statusCounts,
    marketCounts,
    categoryCounts,
    segmentCounts,
    holdReasonCounts,
    staleOpportunities,
    exampleOpportunities: performance.slice(0, 30).map((row) => ({
      brand: row.brand,
      market: row.launchMarket,
      status: row.status,
      category: row.category,
      segment: row.segment,
      nextStep: row.nextStep,
      workingDays: row.workingDays
    })),
    legalQueue: payload.legalQueue.slice(0, 20).map((item) => ({
      brand: item.brand,
      market: item.market,
      ndaStatus: item.ndaStatus,
      requestedAction: item.requestedAction
    })),
    inboxUpdates: payload.inboxUpdates.slice(0, 20).map((item) => ({
      brand: item.brand,
      subject: item.subject,
      summary: item.summary,
      actionNeeded: item.actionNeeded
    }))
  };
}

function buildFocusAnswer(payload: DashboardPayload, query: string): AgentResponse {
  const holdRows = payload.performance.filter((row) => row.status === "Hold");
  const mqlRows = payload.performance.filter((row) => row.status === "MQL");
  const legalPending = payload.legalQueue.filter((row) => row.ndaStatus === "Awaiting details");
  const commercialRows = payload.performance.filter((row) => row.status === "Commercials");
  const oldestRows = [...payload.performance]
    .filter((row) => row.status !== "Reject" && row.status !== "New")
    .sort((left, right) => right.workingDays - left.workingDays)
    .slice(0, 3);

  const answer = [
    `${mqlRows.length} opportunities are sitting in MQL while only ${commercialRows.length} opportunity is in commercials, so conversion discipline is still the main funnel issue.`,
    `${holdRows.length} opportunities are on hold, with the biggest drag coming from sequencing, restructuring, and small-opportunity brands.`,
    legalPending.length > 0
      ? `${legalPending.length} legal items are waiting on signatory details, so NDA collection is a real operational blocker.`
      : "There are no pending NDA detail blockers right now.",
    oldestRows.length > 0
      ? `The most aged active opportunities are ${oldestRows.map((row) => `${row.brand} (${row.workingDays} days)`).join(", ")}.`
      : ""
  ]
    .filter(Boolean)
    .join(" ");

  return {
    ok: true,
    query,
    answer,
    sqlPreview: "SELECT status, COUNT(*), AVG(working_days) FROM opportunities GROUP BY status;",
    resultType: "insights",
    rows: oldestRows.map((row) => formatRow(row)),
    suggestions: [
      "Show brands waiting for NDA details",
      "Which brands are stuck on hold?",
      "Show all commercials and term-sheet items"
    ]
  };
}

export function runLocalAgentQuery(payload: DashboardPayload, rawQuery: string): AgentResponse {
  const query = rawQuery.trim();
  const text = normalize(query);

  if (!query) {
    return {
      ok: true,
      query,
      answer:
        "Ask about any brand, market, category, NDA status, term sheet, latest email update, or next step.",
      sqlPreview: "SELECT * FROM brand_360 LIMIT 5;",
      resultType: "overview",
      rows: [],
      suggestions: [
        "What should I focus on this week?",
        "Show brands waiting for NDA details",
        "What is happening with Beardo?",
        "Show all brands in SEA"
      ]
    };
  }

  const matchedBrands = matchBrands(payload, text);
  if (matchedBrands.length === 1) {
    return buildBrandAnswer(payload, matchedBrands[0], query);
  }

  if (includesAny(text, ["focus", "priority", "priorities", "summary", "insight", "what should i"])) {
    return buildFocusAnswer(payload, query);
  }

  if (includesAny(text, ["nda", "legal", "signatory", "palak", "docusign"])) {
    let rows = payload.legalQueue;
    let where = "";

    if (includesAny(text, ["pending", "awaiting", "waiting"])) {
      rows = rows.filter((row) => row.ndaStatus === "Awaiting details");
      where = " WHERE nda_status = 'Awaiting details'";
    } else if (includesAny(text, ["ready", "prepare", "review"])) {
      rows = rows.filter((row) => row.ndaStatus === "Ready to prepare" || row.ndaStatus === "Ready to send");
      where = " WHERE nda_status IN ('Ready to prepare', 'Ready to send')";
    } else if (includesAny(text, ["sent"])) {
      rows = rows.filter((row) => row.ndaStatus === "Sent for legal review");
      where = " WHERE nda_status = 'Sent for legal review'";
    }

    return {
      ok: true,
      query,
      answer:
        rows.length > 0
          ? `${rows.length} legal item${rows.length > 1 ? "s" : ""} matched your request.`
          : "No legal items matched that request.",
      sqlPreview: `SELECT brand, market, nda_status, signatory_name, requested_action FROM legal_queue${where};`,
      resultType: "legal",
      rows: rows.map((row) => ({
        brand: row.brand,
        market: row.market,
        stage: row.stage,
        owner: row.owner,
        ndaStatus: row.ndaStatus,
        nextStep: row.requestedAction,
        summary: row.lastEmailSummary
      })),
      suggestions: [
        "Show brands ready for NDA preparation",
        "Which brands are waiting for signatory details?",
        "What is the latest legal status for Deconstruct?"
      ]
    };
  }

  if (includesAny(text, ["term sheet", "term-sheet", "proposal", "deck", "document", "docs"])) {
    const rows = payload.brandProfiles
      .filter((profile) =>
        profile.documents.some((document) =>
          includesAny(text, [document.kind, "document", "proposal", "deck", "term sheet", "nda"])
        )
      )
      .flatMap((profile) =>
        profile.documents.map((document) => ({
          brand: profile.brand,
          stage: document.kind,
          nextStep: document.status,
          summary: document.title
        }))
      )
      .filter((row) => {
        if (includesAny(text, ["term sheet", "term-sheet"])) {
          return row.stage === "term-sheet";
        }
        if (text.includes("nda")) {
          return row.stage === "nda";
        }
        if (text.includes("deck")) {
          return row.stage === "deck";
        }
        if (text.includes("proposal")) {
          return row.stage === "proposal";
        }
        return true;
      });

    return {
      ok: true,
      query,
      answer:
        rows.length > 0
          ? `${rows.length} document item${rows.length > 1 ? "s" : ""} matched your request.`
          : "I could not find a matching document signal in the current source snapshot.",
      sqlPreview: "SELECT brand, title, kind, status FROM brand_documents;",
      resultType: "overview",
      rows: rows.slice(0, 10),
      suggestions: [
        "Show term-sheet items",
        "Show NDA documents",
        "What is happening with Nudestix?"
      ]
    };
  }

  if (includesAny(text, ["action", "follow up", "follow-up", "todo", "task"])) {
    let rows = payload.actionItems;
    let where = "";

    if (includesAny(text, ["today", "urgent", "high"])) {
      rows = rows.filter((row) => row.priority === "high" || row.dueLabel.toLowerCase() === "today");
      where = " WHERE priority = 'high' OR due_label = 'Today'";
    } else if (includesAny(text, ["waiting"])) {
      rows = rows.filter((row) => row.status === "waiting");
      where = " WHERE status = 'waiting'";
    }

    return {
      ok: true,
      query,
      answer:
        rows.length > 0
          ? `${rows.length} action item${rows.length > 1 ? "s" : ""} matched your request.`
          : "No action items matched that request.",
      sqlPreview: `SELECT brand, owner, title, priority, status, due_label FROM action_items${where};`,
      resultType: "overview",
      rows: rows.map((row) => ({
        brand: row.brand,
        owner: row.owner,
        stage: row.status,
        nextStep: row.title,
        summary: `${row.title} · due ${row.dueLabel} · source ${row.source}`
      })),
      suggestions: ["What are the urgent actions?", "Show waiting actions", "Which brands need follow-up?"]
    };
  }

  if (includesAny(text, ["email", "mail", "inbox", "latest update", "update"])) {
    const rows = payload.inboxUpdates.filter((row) => {
      if (matchedBrands.length > 0) {
        return matchedBrands.some((brand) => brand.brand === row.brand);
      }
      return true;
    });

    return {
      ok: true,
      query,
      answer:
        rows.length > 0
          ? `I found ${rows.length} inbox-driven brand update${rows.length > 1 ? "s" : ""}.`
          : "No inbox updates are loaded right now.",
      sqlPreview: "SELECT brand, sender, subject, status, action_needed FROM inbox_updates ORDER BY timestamp DESC;",
      resultType: "overview",
      rows: rows.map((row) => ({
        brand: row.brand,
        owner: row.sender,
        stage: row.status,
        nextStep: row.actionNeeded,
        summary: row.summary
      })),
      suggestions: ["Show unread brand updates", "Which brands need follow-up?", "What changed with Beardo?"]
    };
  }

  const dimensionResult = filterByDimension(payload, text);
  if (
    includesAny(text, ["hold", "paused", "commercial", "mql", "sql", "lead", "new", "reject", "market", "category", "segment", "country", "region", "brand", "brands", "how many", "count", "number of"]) ||
    dimensionResult.matchedMarket ||
    dimensionResult.matchedCategory ||
    dimensionResult.matchedSegment ||
    dimensionResult.matchedSourceCountry
  ) {
    return buildDimensionAnswer(payload, query, text);
  }

  return buildPortfolioAnswer(payload, query, text);
}
