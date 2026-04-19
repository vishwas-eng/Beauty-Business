import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface Brand {
  brand_id: string
  brand_name: string
  category?: string
  market?: string
  pipeline_stage?: string
  owner?: string
  confirmed_revenue_usd?: number
  pipeline_potential_usd?: number
  deal_close_date?: string
  notes?: string
  google_drive_folder?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    const apiKey = authHeader.substring(7)
    const expectedApiKey = Deno.env.get('SYNC_API_KEY')
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const brands: Brand[] = await req.json()
    
    if (!Array.isArray(brands) || brands.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid payload: expected array of brands' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const brandsWithTimestamps = brands.map(brand => ({
      ...brand,
      last_synced: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from('brands')
      .upsert(brandsWithTimestamps, {
        onConflict: 'brand_id',
        ignoreDuplicates: false,
      })
      .select()

    if (error) {
      console.error('Supabase upsert error:', error)
      return new Response(JSON.stringify({ 
        error: 'Database error', 
        details: error.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      success: true,
      synced: brands.length,
      brands: data,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
