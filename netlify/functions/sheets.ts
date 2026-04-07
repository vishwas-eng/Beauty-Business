import { mergeSheetDataIntoDashboard } from "../../src/lib/beautyTracker";
import { DashboardPayload, SourceConfig } from "../../src/types/domain";

async function getGoogleAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function fetchBeautyTrackerValues(source: SourceConfig) {
  if (!source.enabled || !source.sheetId) {
    return null;
  }

  const range = encodeURIComponent(`${source.tabName}!${source.range}`);
  const accessToken = await getGoogleAccessToken();
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  if (!accessToken && !apiKey) {
    return null;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${source.sheetId}/values/${range}${
    apiKey && !accessToken ? `?key=${apiKey}` : ""
  }`;

  const response = await fetch(url, {
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`
        }
      : undefined
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { values?: string[][] };
  return data.values ?? null;
}

export async function buildDashboardFromGoogleSheet(
  currentDashboard: DashboardPayload,
  source: SourceConfig
) {
  const values = await fetchBeautyTrackerValues(source);
  if (!values?.length) {
    return null;
  }

  return mergeSheetDataIntoDashboard(currentDashboard, values, new Date().toISOString());
}
