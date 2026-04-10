/**
 * AI Inventory Planning Agent
 * Generates demand forecasts and reorder recommendations using Claude AI
 */

import Anthropic from '@anthropic/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface ForecastInput {
  workspaceId: string;
  sku: string;
  productName: string;
  category: string;
  brand: string;
  channel: string;
  salesHistory: Array<{
    date: string;
    quantitySold: number;
    revenue: number;
    unitPrice: number;
  }>;
  currentStock: number;
  leadTimeDays: number;
}

interface ForecastOutput {
  predictedDemand: number;
  confidenceIntervalLower: number;
  confidenceIntervalUpper: number;
  confidenceScore: number;
  recommendedOrderQty: number;
  reorderPoint: number;
  safetyStock: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  insights: string[];
}

export async function generateDemandForecast(input: ForecastInput): Promise<ForecastOutput> {
  const prompt = `You are an expert inventory planning AI. Analyze the following sales data and generate a demand forecast with reorder recommendations.

Product Details:
- SKU: ${input.sku}
- Name: ${input.productName}
- Category: ${input.category}
- Brand: ${input.brand}
- Channel: ${input.channel}
- Current Stock: ${input.currentStock} units
- Lead Time: ${input.leadTimeDays} days

Sales History (last 90 days):
${JSON.stringify(input.salesHistory, null, 2)}

Generate a JSON response with the following structure:
{
  "predictedDemand": <average daily demand for next 30 days>,
  "confidenceIntervalLower": <lower bound of 95% confidence interval>,
  "confidenceIntervalUpper": <upper bound of 95% confidence interval>,
  "confidenceScore": <0-1 score indicating forecast confidence>,
  "recommendedOrderQty": <quantity to order now>,
  "reorderPoint": <stock level that triggers reorder>,
  "safetyStock": <buffer stock for variability>,
  "priority": "critical" | "high" | "medium" | "low",
  "reason": <brief explanation>,
  "insights": [<list of key insights from the data>]
}

Consider:
- Seasonal patterns in the sales data
- Recent trends (increasing/decreasing demand)
- Stock coverage based on current inventory
- Lead time requirements
- Safety stock for demand variability

Respond ONLY with valid JSON.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }

    throw new Error('Failed to parse AI response');
  } catch (error) {
    console.error('Forecast generation error:', error);
    
    // Fallback to simple statistical forecast
    return generateSimpleForecast(input);
  }
}

function generateSimpleForecast(input: ForecastInput): ForecastOutput {
  const sales = input.salesHistory;
  
  if (sales.length === 0) {
    return {
      predictedDemand: 0,
      confidenceIntervalLower: 0,
      confidenceIntervalUpper: 0,
      confidenceScore: 0.5,
      recommendedOrderQty: 0,
      reorderPoint: 0,
      safetyStock: 0,
      priority: 'low',
      reason: 'No sales history available',
      insights: ['No historical data to analyze']
    };
  }

  // Calculate average daily demand
  const totalQuantity = sales.reduce((sum, s) => sum + s.quantitySold, 0);
  const avgDailyDemand = totalQuantity / sales.length;

  // Calculate standard deviation
  const variance = sales.reduce((sum, s) => {
    return sum + Math.pow(s.quantitySold - avgDailyDemand, 2);
  }, 0) / sales.length;
  const stdDev = Math.sqrt(variance);

  // Calculate safety stock (for 95% service level)
  const safetyStock = Math.ceil(1.65 * stdDev * Math.sqrt(input.leadTimeDays));

  // Calculate reorder point
  const reorderPoint = Math.ceil((avgDailyDemand * input.leadTimeDays) + safetyStock);

  // Calculate recommended order quantity (30-day supply)
  const daysOfCoverage = input.currentStock / avgDailyDemand;
  let recommendedOrderQty = 0;
  let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
  let reason = '';

  if (input.currentStock <= safetyStock) {
    recommendedOrderQty = Math.ceil((avgDailyDemand * 30) - input.currentStock + safetyStock);
    priority = 'critical';
    reason = 'Stock below safety level - immediate action required';
  } else if (input.currentStock < reorderPoint) {
    recommendedOrderQty = Math.ceil((avgDailyDemand * 30) - input.currentStock + safetyStock);
    priority = 'high';
    reason = 'Stock approaching reorder point';
  } else if (daysOfCoverage < 45) {
    recommendedOrderQty = Math.ceil(avgDailyDemand * 30);
    priority = 'medium';
    reason = 'Routine replenishment recommended';
  } else {
    priority = 'low';
    reason = 'Stock levels adequate';
  }

  // Confidence intervals
  const confidenceIntervalLower = Math.max(0, avgDailyDemand - (1.96 * stdDev));
  const confidenceIntervalUpper = avgDailyDemand + (1.96 * stdDev);

  // Confidence score based on data consistency
  const cv = stdDev / avgDailyDemand; // Coefficient of variation
  const confidenceScore = Math.max(0.3, Math.min(0.95, 1 - cv));

  return {
    predictedDemand: Math.round(avgDailyDemand * 100) / 100,
    confidenceIntervalLower: Math.round(confidenceIntervalLower * 100) / 100,
    confidenceIntervalUpper: Math.round(confidenceIntervalUpper * 100) / 100,
    confidenceScore: Math.round(confidenceScore * 100) / 100,
    recommendedOrderQty,
    reorderPoint,
    safetyStock,
    priority,
    reason,
    insights: [
      `Average daily demand: ${avgDailyDemand.toFixed(1)} units`,
      `Current stock covers ${daysOfCoverage.toFixed(1)} days`,
      `Demand variability (CV): ${(cv * 100).toFixed(1)}%`
    ]
  };
}

export async function generateInventoryInsights(data: {
  totalSKUs: number;
  lowStockCount: number;
  overstockCount: number;
  totalValue: number;
  turnoverRate?: number;
}): Promise<string[]> {
  const prompt = `You are an inventory analytics expert. Provide actionable insights based on the following metrics:

- Total SKUs: ${data.totalSKUs}
- Low Stock Items: ${data.lowStockCount}
- Overstock Items: ${data.overstockCount}
- Total Inventory Value: $${data.totalValue.toLocaleString()}
- Turnover Rate: ${data.turnoverRate || 'N/A'}

Provide 3-5 concise, actionable insights as a JSON array of strings.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    }
  } catch (error) {
    console.error('Insights generation error:', error);
  }

  // Fallback insights
  const insights: string[] = [];
  
  if (data.lowStockCount > 0) {
    insights.push(`${data.lowStockCount} items are at risk of stockout - prioritize replenishment`);
  }
  
  if (data.overstockCount > 0) {
    insights.push(`${data.overstockCount} items have excess inventory - consider promotions or reduced ordering`);
  }
  
  if (data.totalValue > 100000) {
    insights.push(`High inventory value ($${(data.totalValue / 1000).toFixed(1)}K) - review carrying costs`);
  }
  
  if (data.turnoverRate && data.turnoverRate < 4) {
    insights.push('Low turnover rate - optimize inventory levels to free up capital');
  }
  
  if (insights.length === 0) {
    insights.push('Inventory health appears stable - continue monitoring key metrics');
  }

  return insights;
}

export default {
  generateDemandForecast,
  generateInventoryInsights
};
