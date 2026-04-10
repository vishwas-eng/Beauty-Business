import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: "Supabase not configured" });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (req.method === "POST") {
    const { workspaceId, sku, channel, forecastDays = 30 } = req.body;

    if (!workspaceId || !sku) {
      return res.status(400).json({ error: "workspaceId and sku required" });
    }

    // Generate forecast using database function
    const { data: forecast, error } = await supabase.rpc("generate_demand_forecast", {
      p_workspace_id: workspaceId,
      p_sku: sku,
      p_channel: channel || "all",
      p_forecast_days: parseInt(forecastDays)
    });

    if (error) {
      console.error("Forecast error:", error);
      return res.status(200).json({
        ok: false,
        error: error.message,
        forecast: [],
        message: "Insufficient historical data for forecasting"
      });
    }

    // Save forecast to database
    if (forecast && forecast.length > 0) {
      const forecastRecords = forecast.map((f: any) => ({
        workspace_id: workspaceId,
        forecast_date: f.forecast_date,
        forecast_horizon_days: forecastDays,
        sku: sku,
        product_name: f.product_name || sku,
        category: f.category || "Unknown",
        brand: f.brand || "Unknown",
        channel: channel || "all",
        predicted_demand: f.predicted_demand,
        confidence_interval_lower: f.confidence_lower,
        confidence_interval_upper: f.confidence_upper,
        confidence_score: f.confidence_score
      }));

      await supabase.from("demand_forecasts").upsert(forecastRecords);
    }

    return res.status(200).json({
      ok: true,
      forecast: forecast || [],
      message: `Generated ${forecast?.length || 0} day forecast`
    });
  }

  if (req.method === "GET") {
    const { workspaceId, sku, forecastDate } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: "workspaceId required" });
    }

    let query = supabase
      .from("demand_forecasts")
      .select("*")
      .eq("workspace_id", workspaceId);

    if (sku) {
      query = query.eq("sku", sku as string);
    }

    if (forecastDate) {
      query = query.eq("forecast_date", forecastDate);
    }

    const { data, error } = await query.order("forecast_date");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      ok: true,
      forecasts: data || []
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
