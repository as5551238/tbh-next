// Supabase Edge Function: AI Chat Proxy
// Secures API keys server-side — frontend never sees them.
// Supports: deepseek, doubao, openai, qwen (auto-detected from model id)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const PROVIDERS: Record<string, { endpoint: string; envKey: string }> = {
  deepseek: {
    endpoint: 'https://api.deepseek.com',
    envKey: 'DEEPSEEK_API_KEY',
  },
  doubao: {
    endpoint: 'https://ark.cn-beijing.volces.com/api/v3',
    envKey: 'DOUBAO_API_KEY',
  },
  openai: {
    endpoint: 'https://api.openai.com',
    envKey: 'OPENAI_API_KEY',
  },
  qwen: {
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode',
    envKey: 'QWEN_API_KEY',
  },
}

function detectProvider(model: string): string {
  if (model.startsWith('deepseek')) return 'deepseek'
  if (model.startsWith('doubao')) return 'doubao'
  if (model.startsWith('gpt')) return 'openai'
  if (model.startsWith('qwen')) return 'qwen'
  // Default to deepseek
  return 'deepseek'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { messages, model: requestedModel, stream } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'Messages array is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const model = requestedModel || 'deepseek-chat'
    const provider = detectProvider(model)
    const config = PROVIDERS[provider]

    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown provider for model: ${model}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get(config.envKey)
    if (!apiKey) {
      return new Response(JSON.stringify({ error: `Provider ${provider} not configured on server` }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Forward to LLM API
    const llmResponse = await fetch(`${config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    })

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => 'Unknown error')
      console.error(`LLM API error ${llmResponse.status}: ${errText}`)
      return new Response(JSON.stringify({ error: `AI API error: ${llmResponse.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const json = await llmResponse.json()
    const text = json.choices?.[0]?.message?.content ?? ''
    const usage = json.usage
      ? { prompt_tokens: json.usage.prompt_tokens, completion_tokens: json.usage.completion_tokens }
      : undefined

    return new Response(JSON.stringify({ text, usage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
