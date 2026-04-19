/**
 * Opptra Softline Master Tracker - Google Sheet Sync Script
 * 
 * Installation:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Replace all code with this file
 * 4. Set your SUPABASE_FUNCTION_URL and SYNC_API_KEY in script properties
 * 5. Run setupTriggers() once to install the onEdit trigger
 */

// Sheet configuration - adjust these to match your sheet
const CONFIG = {
  SHEET_NAME: "Master Tracker",
  DATA_START_ROW: 2,
  COLUMNS: {
    BRAND_ID: 1,
    BRAND_NAME: 2,
    CATEGORY: 3,
    MARKET: 4,
    PIPELINE_STAGE: 5,
    OWNER: 6,
    CONFIRMED_REVENUE: 7,
    PIPELINE_POTENTIAL: 8,
    DEAL_CLOSE_DATE: 9,
    NOTES: 10,
    GOOGLE_DRIVE_FOLDER: 11,
    LAST_SYNCED: 12
  }
};

function getScriptProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * Sync changed rows automatically when sheet is edited
 */
function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    
    if (sheet.getName() !== CONFIG.SHEET_NAME) return;
    if (range.getRow() < CONFIG.DATA_START_ROW) return;
    
    const startRow = range.getRow();
    const endRow = range.getLastRow();
    
    const rowsToSync = [];
    for (let row = startRow; row <= endRow; row++) {
      const brandData = getRowData(sheet, row);
      if (brandData && brandData.brand_id) {
        rowsToSync.push(brandData);
      }
    }
    
    if (rowsToSync.length > 0) {
      const result = syncToSupabase(rowsToSync);
      
      if (result.success) {
        const now = new Date();
        for (let i = 0; i < rowsToSync.length; i++) {
          sheet.getRange(startRow + i, CONFIG.COLUMNS.LAST_SYNCED).setValue(now);
        }
      }
    }
  } catch (error) {
    console.error("onEdit error:", error);
  }
}

/**
 * Full sync of all brands in the sheet
 * Run this manually for initial import or full refresh
 */
function syncAllBrands() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  const lastRow = sheet.getLastRow();
  
  const allBrands = [];
  for (let row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
    const brandData = getRowData(sheet, row);
    if (brandData && brandData.brand_id) {
      allBrands.push(brandData);
    }
  }
  
  if (allBrands.length === 0) {
    SpreadsheetApp.getUi().alert("No brands found to sync");
    return;
  }
  
  const result = syncToSupabase(allBrands);
  
  if (result.success) {
    const now = new Date();
    for (let row = CONFIG.DATA_START_ROW; row <= lastRow; row++) {
      sheet.getRange(row, CONFIG.COLUMNS.LAST_SYNCED).setValue(now);
    }
    SpreadsheetApp.getUi().alert(`Successfully synced ${result.synced} brands`);
  } else {
    SpreadsheetApp.getUi().alert(`Sync failed: ${result.error}`);
  }
}

/**
 * Extract and normalize row data from sheet
 */
function getRowData(sheet, rowNum) {
  const row = sheet.getRange(rowNum, 1, 1, 11).getValues()[0];
  
  const brandData = {
    brand_id: String(row[CONFIG.COLUMNS.BRAND_ID - 1] || "").trim(),
    brand_name: String(row[CONFIG.COLUMNS.BRAND_NAME - 1] || "").trim(),
    category: String(row[CONFIG.COLUMNS.CATEGORY - 1] || "").trim() || null,
    market: String(row[CONFIG.COLUMNS.MARKET - 1] || "").trim() || null,
    pipeline_stage: String(row[CONFIG.COLUMNS.PIPELINE_STAGE - 1] || "").trim() || null,
    owner: String(row[CONFIG.COLUMNS.OWNER - 1] || "").trim() || null,
    confirmed_revenue_usd: Number(row[CONFIG.COLUMNS.CONFIRMED_REVENUE - 1]) || 0,
    pipeline_potential_usd: Number(row[CONFIG.COLUMNS.PIPELINE_POTENTIAL - 1]) || 0,
    deal_close_date: row[CONFIG.COLUMNS.DEAL_CLOSE_DATE - 1] ? 
      Utilities.formatDate(row[CONFIG.COLUMNS.DEAL_CLOSE_DATE - 1], Session.getScriptTimeZone(), "yyyy-MM-dd") : null,
    notes: String(row[CONFIG.COLUMNS.NOTES - 1] || "").trim() || null,
    google_drive_folder: String(row[CONFIG.COLUMNS.GOOGLE_DRIVE_FOLDER - 1] || "").trim() || null
  };
  
  if (!brandData.brand_id || !brandData.brand_name) {
    return null;
  }
  
  return brandData;
}

/**
 * Send data to Supabase Edge Function
 */
function syncToSupabase(brands) {
  const functionUrl = getScriptProperty("SUPABASE_FUNCTION_URL");
  const apiKey = getScriptProperty("SYNC_API_KEY");
  
  if (!functionUrl) {
    return { success: false, error: "SUPABASE_FUNCTION_URL not set in script properties" };
  }
  
  try {
    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "Authorization": `Bearer ${apiKey || ""}`
      },
      payload: JSON.stringify(brands),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(functionUrl, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();
    
    if (responseCode === 200) {
      return JSON.parse(responseBody);
    } else {
      console.error("Sync failed with status", responseCode, responseBody);
      return { success: false, error: `HTTP ${responseCode}: ${responseBody}` };
    }
  } catch (error) {
    console.error("Network error:", error);
    return { success: false, error: error.toString() };
  }
}

/**
 * Setup automatic trigger for real-time sync
 */
function setupTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  
  for (const trigger of triggers) {
    if (trigger.getHandlerFunction() === "onEdit") {
      ScriptApp.deleteTrigger(trigger);
    }
  }
  
  ScriptApp.newTrigger("onEdit")
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create();
  
  SpreadsheetApp.getUi().alert("Sync trigger installed successfully! Edits will now sync automatically.");
}

/**
 * Open setup dialog to configure environment variables
 */
function showSetupDialog() {
  const html = HtmlService.createHtmlOutput(`
    <div style="padding: 20px; font-family: Arial;">
      <h3>Opptra Sync Configuration</h3>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px;">Supabase Function URL:</label>
        <input type="text" id="functionUrl" style="width: 100%; padding: 8px;" placeholder="https://<project>.supabase.co/functions/v1/sync-brands">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px;">Sync API Key (optional):</label>
        <input type="password" id="apiKey" style="width: 100%; padding: 8px;">
      </div>
      <button onclick="saveConfig()" style="padding: 10px 20px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer;">Save & Install Trigger</button>
    </div>
    <script>
      function saveConfig() {
        const functionUrl = document.getElementById('functionUrl').value;
        const apiKey = document.getElementById('apiKey').value;
        google.script.run
          .withSuccessHandler(() => {
            google.script.host.close();
            alert('Configuration saved!');
          })
          .saveConfiguration(functionUrl, apiKey);
      }
    </script>
  `).setWidth(400).setHeight(300);
  
  SpreadsheetApp.getUi().showModalDialog(html, "Setup Sync Configuration");
}

function saveConfiguration(functionUrl, apiKey) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty("SUPABASE_FUNCTION_URL", functionUrl);
  if (apiKey) props.setProperty("SYNC_API_KEY", apiKey);
  setupTriggers();
}

/**
 * Add custom menu to Google Sheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Opptra Sync')
    .addItem('Sync All Brands Now', 'syncAllBrands')
    .addItem('Setup Configuration', 'showSetupDialog')
    .addItem('Reinstall Trigger', 'setupTriggers')
    .addToUi();
}
