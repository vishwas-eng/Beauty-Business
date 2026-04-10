import { mergeSheetDataIntoDashboard } from "../../src/lib/beautyTracker";
import { DashboardPayload, SourceConfig } from "../../src/types/domain";
import { fetchWithRetry, logger } from "./production";

function hasAppsScriptConfig() {
  return Boolean(process.env.GOOGLE_APPS_SCRIPT_URL && process.env.GOOGLE_APPS_SCRIPT_KEY);
}

async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    logger.debug("Google OAuth credentials not fully configured");
    return null;
  }

  try {
    const response = await fetchWithRetry("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token"
      }),
      retries: 2,
      timeout: 15000
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("Google OAuth token request failed", new Error(errorText), { status: response.status });
      return null;
    }

    const data = (await response.json()) as { access_token?: string };
    return data.access_token ?? null;
  } catch (error) {
    logger.error("Failed to get Google access token", error as Error);
    return null;
  }
}

async function fetchFromAppsScript() {
  const baseUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  const key = process.env.GOOGLE_APPS_SCRIPT_KEY;
  if (!baseUrl || !key) {
    logger.debug("Apps Script configuration missing");
    return null;
  }

  try {
    const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}key=${encodeURIComponent(key)}`;
    const response = await fetchWithRetry(url, {
      retries: 2,
      timeout: 30000
    });

    if (!response.ok) {
      logger.warn("Apps Script request failed", { status: response.status });
      return null;
    }

    const data = (await response.json()) as {
      ok?: boolean;
      headers?: string[];
      rows?: Array<Record<string, string> | string[]>;
    };

    if (!data.ok || !data.headers?.length || !data.rows) {
      logger.warn("Invalid Apps Script response format");
      return null;
    }

    const headers = data.headers.map((h) => String(h ?? "").trim());
    const rows = data.rows.map((row) => {
      if (Array.isArray(row)) return row.map((v) => String(v ?? "").trim());
      return headers.map((h) => String(row[h] ?? "").trim());
    });

    return [headers, ...rows];
  } catch (error) {
    logger.error("Apps Script request failed", error as Error);
    return null;
  }
}

export async function fetchBeautyTrackerValues(source: SourceConfig) {
  if (!source.enabled) return null;

  const appsScriptValues = await fetchFromAppsScript();
  if (appsScriptValues?.length) {
    logger.info("Successfully fetched data from Apps Script", { rowCount: appsScriptValues.length - 1 });
    return appsScriptValues;
  }

  if (!source.sheetId) {
    logger.debug("No sheet ID configured for source");
    return null;
  }

  const range = encodeURIComponent(`${source.tabName}!${source.range}`);
  const accessToken = await getGoogleAccessToken();
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (!accessToken && !apiKey) {
    logger.warn("No Google authentication method available");
    return null;
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${source.sheetId}/values/${range}${
      apiKey && !accessToken ? `?key=${apiKey}` : ""
    }`;

    const response = await fetchWithRetry(url, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
      retries: 2,
      timeout: 20000
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn("Sheets API request failed", { status: response.status, error: errorText });
      return null;
    }

    const data = (await response.json()) as { values?: string[][] };
    if (data.values?.length) {
      logger.info("Successfully fetched data from Sheets API", { rowCount: data.values.length - 1 });
    }
    return data.values ?? null;
  } catch (error) {
    logger.error("Sheets API request failed", error as Error, { sheetId: source.sheetId });
    return null;
  }
}

export async function buildDashboardFromGoogleSheet(
  currentDashboard: DashboardPayload,
  source: SourceConfig
) {
  const values = await fetchBeautyTrackerValues(source);
  if (!values?.length) return null;
  return mergeSheetDataIntoDashboard(currentDashboard, values, new Date().toISOString());
}

export function hasLiveSheetSource() {
  return Boolean(hasAppsScriptConfig() || process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_REFRESH_TOKEN);
}
