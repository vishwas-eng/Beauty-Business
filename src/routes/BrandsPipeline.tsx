import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { KpiCard } from "../components/KpiCard";
import { Loader2, RefreshCw } from "lucide-react";
import clsx from "clsx";

interface Brand {
  id: string;
  brand_id: string;
  brand_name: string;
  category?: string;
  market?: string;
  pipeline_stage?: string;
  owner?: string;
  confirmed_revenue_usd: number;
  pipeline_potential_usd: number;
  deal_close_date?: string;
  notes?: string;
  last_updated: string;
  last_synced?: string;
}

const PIPELINE_STAGES = [
  "Lead",
  "MQL",
  "SQL",
  "Commercials",
  "Signed",
  "Live",
  "Hold",
  "Reject"
];

const STAGE_COLORS: Record<string, string> = {
  Lead: "bg-slate-500",
  MQL: "bg-blue-500",
  SQL: "bg-cyan-500",
  Commercials: "bg-amber-500",
  Signed: "bg-green-500",
  Live: "bg-emerald-600",
  Hold: "bg-orange-500",
  Reject: "bg-red-500"
};

export function BrandsPipeline() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setError("Supabase not configured");
      setLoading(false);
      return;
    }

    const fetchBrands = async () => {
      try {
        const { data, error } = await supabase
          .from("brands")
          .select("*")
          .order("brand_name");

        if (error) throw error;
        setBrands(data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchBrands();

    const channel = supabase
      .channel("brands-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "brands" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setBrands(prev => [...prev, payload.new as Brand].sort((a, b) => 
              a.brand_name.localeCompare(b.brand_name)
            ));
          } else if (payload.eventType === "UPDATE") {
            setBrands(prev => prev.map(b => 
              b.id === payload.new.id ? payload.new as Brand : b
            ).sort((a, b) => a.brand_name.localeCompare(b.brand_name)));
          } else if (payload.eventType === "DELETE") {
            setBrands(prev => prev.filter(b => b.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const metrics = useMemo(() => {
    const totalBrands = brands.length;
    const confirmedRevenue = brands.reduce((sum, b) => sum + (b.confirmed_revenue_usd || 0), 0);
    const pipelinePotential = brands.reduce((sum, b) => sum + (b.pipeline_potential_usd || 0), 0);
    const beautyCount = brands.filter(b => b.category?.toLowerCase() === "beauty").length;
    const fashionCount = brands.filter(b => ["fashion", "apparel", "footwear"].includes(b.category?.toLowerCase() || "")).length;

    return [
      { label: "Total Brands", value: String(totalBrands), delta: "+0%", tone: "neutral", hint: "Active in pipeline" },
      { label: "Confirmed Revenue", value: `$${confirmedRevenue.toLocaleString()}`, delta: "+12.4%", tone: "positive", hint: "Signed deals" },
      { label: "Pipeline Potential", value: `$${pipelinePotential.toLocaleString()}`, delta: "+8.1%", tone: "info", hint: "Total opportunity" },
      { label: "Beauty / Fashion", value: `${beautyCount} / ${fashionCount}`, delta: "+3 this month", tone: "neutral", hint: "Category split" }
    ];
  }, [brands]);

  const groupedByStage = useMemo(() => {
    const groups: Record<string, Brand[]> = {};
    PIPELINE_STAGES.forEach(stage => {
      groups[stage] = brands.filter(b => b.pipeline_stage === stage);
    });
    return groups;
  }, [brands]);

  const refresh = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from("brands").select("*").order("brand_name");
    setBrands(data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <p className="text-red-500 font-medium">Failed to load brands</p>
          <p className="text-slate-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brands Pipeline</h1>
          <p className="text-slate-500 mt-1">Real-time sync from Google Sheet</p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <KpiCard key={idx} metric={metric} />
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-4 pb-4 min-w-max">
          {PIPELINE_STAGES.map(stage => (
            <div key={stage} className="w-72 flex-shrink-0">
              <div className="bg-slate-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={clsx("w-2.5 h-2.5 rounded-full", STAGE_COLORS[stage])} />
                    <h3 className="font-semibold text-slate-700 text-sm">{stage}</h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500 bg-white px-2 py-0.5 rounded">
                    {groupedByStage[stage].length}
                  </span>
                </div>

                <div className="space-y-2">
                  {groupedByStage[stage].map(brand => (
                    <div
                      key={brand.id}
                      className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 hover:shadow-md transition-shadow"
                    >
                      <h4 className="font-medium text-slate-900 text-sm truncate">
                        {brand.brand_name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {brand.market && (
                          <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {brand.market}
                          </span>
                        )}
                        {brand.category && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                            {brand.category}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex justify-between items-center text-xs">
                        {brand.owner && (
                          <span className="text-slate-500">{brand.owner}</span>
                        )}
                        {brand.confirmed_revenue_usd > 0 && (
                          <span className="font-medium text-green-600">
                            ${brand.confirmed_revenue_usd.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
