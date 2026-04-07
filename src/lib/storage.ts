import { AutomationConfig, DashboardPayload, SourceConfig } from "../types/domain";
import { defaultAutomationConfig, defaultSourceConfig, liveDashboard } from "./liveSnapshot";

const DASHBOARD_KEY = "softlines-dashboard-demo-data-v2";
const SOURCE_KEY = "softlines-dashboard-source";
const AUTOMATION_KEY = "softlines-dashboard-automation";

function isValidDashboardPayload(payload: DashboardPayload) {
  return (
    Array.isArray(payload.performance) &&
    payload.performance.length >= 30 &&
    payload.performance.some((row) => Boolean(row.brand?.trim()) && Boolean(row.launchMarket?.trim())) &&
    payload.performance.some((row) => Boolean(row.sourceCountry?.trim())) &&
    payload.performance.some((row) => row.brand?.trim() === "Nudestix")
  );
}

export function loadStoredDashboard() {
  const raw = localStorage.getItem(DASHBOARD_KEY);
  if (!raw) {
    return liveDashboard;
  }

  try {
    const parsed = JSON.parse(raw) as DashboardPayload;
    const merged = {
      ...liveDashboard,
      ...parsed
    };
    if (!isValidDashboardPayload(merged)) {
      return liveDashboard;
    }
    return merged;
  } catch {
    return liveDashboard;
  }
}

export function saveStoredDashboard(payload: DashboardPayload) {
  localStorage.setItem(DASHBOARD_KEY, JSON.stringify(payload));
}

export function loadSourceConfig() {
  const raw = localStorage.getItem(SOURCE_KEY);
  if (!raw) {
    return defaultSourceConfig;
  }

  try {
    return JSON.parse(raw) as SourceConfig;
  } catch {
    return defaultSourceConfig;
  }
}

export function saveSourceConfig(payload: SourceConfig) {
  localStorage.setItem(SOURCE_KEY, JSON.stringify(payload));
}

export function loadAutomationConfig() {
  const raw = localStorage.getItem(AUTOMATION_KEY);
  if (!raw) {
    return defaultAutomationConfig;
  }

  try {
    return JSON.parse(raw) as AutomationConfig;
  } catch {
    return defaultAutomationConfig;
  }
}

export function saveAutomationConfig(payload: AutomationConfig) {
  localStorage.setItem(AUTOMATION_KEY, JSON.stringify(payload));
}
