/**
 * Inventory Metrics API Endpoint
 * Returns comprehensive inventory KPIs and health metrics
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { generateInventoryInsights } from './_lib/inventory-agent';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pxttfmdfmucxnzosmfcm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { workspaceId, category, brand } = req.query;

    if (!workspaceId) {
      return res.status(400).json({ error: 'workspaceId is required' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get latest inventory snapshot date
    const { data: latestSnapshot } = await supabase
      .from('inventory_snapshots')
      .select('snapshot_date')
      .eq('workspace_id', workspaceId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();

    const snapshotDate = latestSnapshot?.snapshot_date || new Date().toISOString().split('T')[0];

    // Build base query
    let query = supabase
      .from('inventory_snapshots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('snapshot_date', snapshotDate);

    if (category) {
      query = query.eq('category', category as string);
    }
    if (brand) {
      query = query.eq('brand', brand as string);
    }

    const { data: snapshots, error } = await query;

    if (error) {
      console.error('Error fetching inventory:', error);
      return res.status(500).json({ error: 'Failed to fetch inventory data' });
    }

    if (!snapshots || snapshots.length === 0) {
      return res.json({
        snapshotDate,
        totalSKUs: 0,
        totalValue: 0,
        totalUnits: 0,
        lowStockCount: 0,
        overstockCount: 0,
        avgDaysOfSupply: 0,
        byCategory: [],
        byBrand: [],
        alerts: [],
        insights: []
      });
    }

    // Calculate metrics
    const totalSKUs = snapshots.length;
    const totalValue = snapshots.reduce((sum, s) => sum + Number(s.total_value || 0), 0);
    const totalUnits = snapshots.reduce((sum, s) => sum + Number(s.quantity_available || 0), 0);
    
    const lowStockThreshold = 7;
    const overstockThreshold = 90;
    
    const lowStockCount = snapshots.filter(s => (s.days_of_supply || 0) < lowStockThreshold).length;
    const overstockCount = snapshots.filter(s => (s.days_of_supply || 0) > overstockThreshold).length;
    
    const avgDaysOfSupply = snapshots.reduce((sum, s) => sum + (s.days_of_supply || 0), 0) / totalSKUs;

    // Group by category
    const categoryMap = new Map<string, any>();
    snapshots.forEach(s => {
      if (!categoryMap.has(s.category)) {
        categoryMap.set(s.category, {
          category: s.category,
          skuCount: 0,
          totalValue: 0,
          totalUnits: 0,
          lowStockCount: 0,
          overstockCount: 0
        });
      }
      const cat = categoryMap.get(s.category);
      cat.skuCount++;
      cat.totalValue += Number(s.total_value || 0);
      cat.totalUnits += Number(s.quantity_available || 0);
      if ((s.days_of_supply || 0) < lowStockThreshold) cat.lowStockCount++;
      if ((s.days_of_supply || 0) > overstockThreshold) cat.overstockCount++;
    });

    // Group by brand
    const brandMap = new Map<string, any>();
    snapshots.forEach(s => {
      if (!brandMap.has(s.brand)) {
        brandMap.set(s.brand, {
          brand: s.brand,
          skuCount: 0,
          totalValue: 0,
          totalUnits: 0
        });
      }
      const br = brandMap.get(s.brand);
      br.skuCount++;
      br.totalValue += Number(s.total_value || 0);
      br.totalUnits += Number(s.quantity_available || 0);
    });

    // Get active alerts
    const { data: alerts } = await supabase
      .from('inventory_alerts')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(10);

    // Generate AI insights
    const insights = await generateInventoryInsights({
      totalSKUs,
      lowStockCount,
      overstockCount,
      totalValue
    });

    return res.json({
      snapshotDate,
      totalSKUs,
      totalValue,
      totalUnits,
      lowStockCount,
      overstockCount,
      avgDaysOfSupply: Math.round(avgDaysOfSupply * 100) / 100,
      byCategory: Array.from(categoryMap.values()),
      byBrand: Array.from(brandMap.values()),
      alerts: alerts || [],
      insights
    });

  } catch (error) {
    console.error('Inventory metrics error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
