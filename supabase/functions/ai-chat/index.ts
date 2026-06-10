// Supabase Edge Function: AI Chat Proxy v3
// - Server-side tool execution (query_goals, query_tasks, query_metrics, create_task, update_task)
// - Tool-calling loop: LLM -> tool execution -> LLM -> final text
// - Multi-provider support (DeepSeek, Doubao, OpenAI, Qwen)
// - Demo mode when no API key configured
// - Streaming (SSE) + non-streaming

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  return 'deepseek'
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getApiKey(supabase: any, envKey: string): Promise<string | null> {
  const envVal = Deno.env.get(envKey)
  if (envVal) return envVal

  try {
    const { data, error } = await supabase
      .from('vault_decrypted_secrets')
      .select('decrypted_secret')
      .eq('name', envKey)
      .single()
    if (!error && data?.decrypted_secret) return data.decrypted_secret
  } catch {
    // vault table might not exist
  }

  try {
    const { data, error } = await supabase.rpc('vault.read_secret', { secret_name: envKey })
    if (!error && data) return typeof data === 'string' ? data : data?.secret
  } catch {
    // ignore
  }

  return null
}

// --- Server-side tool definitions (OpenAI function-calling format) ---

const SERVER_TOOL_DEFS = [
  {
    type: 'function',
    function: {
      name: 'query_goals',
      description: '查询团队目标列表。返回目标ID、标题、进度、状态、截止日期等。',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: '按状态筛选',
            enum: ['active', 'completed', 'cancelled', 'paused'],
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_tasks',
      description: '查询任务列表。可按目标ID或状态筛选。返回任务ID、标题、状态、优先级、截止日期等。',
      parameters: {
        type: 'object',
        properties: {
          goal_id: { type: 'string', description: '按关联目标ID筛选' },
          status: {
            type: 'string',
            description: '按状态筛选',
            enum: ['todo', 'in_progress', 'done', 'blocked', 'cancelled'],
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_metrics',
      description: '获取团队核心指标：目标总数、完成率、任务总数、完成率、逾期任务数、平均目标进度。',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: '创建新任务。可指定标题、优先级、关联目标和截止日期。标题必填。',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: '任务标题' },
          priority: {
            type: 'string',
            description: '优先级',
            enum: ['urgent', 'high', 'medium', 'low'],
          },
          goal_id: { type: 'string', description: '关联目标ID' },
          due_date: { type: 'string', description: '截止日期 (YYYY-MM-DD)' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: '更新已有任务。可修改状态、标题、优先级、完成标记等。task_id必填。',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: '任务ID' },
          status: {
            type: 'string',
            description: '新状态',
            enum: ['todo', 'in_progress', 'done', 'blocked', 'cancelled'],
          },
          title: { type: 'string', description: '新标题' },
          priority: {
            type: 'string',
            description: '新优先级',
            enum: ['urgent', 'high', 'medium', 'low'],
          },
          done: { type: 'boolean', description: '是否完成' },
        },
        required: ['task_id'],
      },
    },
  },
]

// --- Server-side tool executors ---

async function executeServerTool(
  supabase: any,
  name: string,
  args: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  switch (name) {
    case 'query_goals': {
      let q = supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (args.status) q = q.eq('status', args.status)
      const { data, error } = await q
      if (error) return { error: error.message }
      return (data ?? []).map((g: any) => ({
        id: g.id,
        title: g.title,
        progress: g.progress ?? 0,
        status: g.status,
        end_date: g.end_date,
        created_at: g.created_at,
        updated_at: g.updated_at,
      }))
    }

    case 'query_tasks': {
      let q = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (args.goal_id) q = q.eq('goal_id', args.goal_id)
      if (args.status) q = q.eq('status', args.status)
      const { data, error } = await q
      if (error) return { error: error.message }
      return (data ?? []).map((t: any) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        goal_id: t.goal_id,
        due_date: t.due_date,
        done: t.done,
      }))
    }

    case 'query_metrics': {
      const [gRes, tRes] = await Promise.all([
        supabase.from('goals').select('*'),
        supabase.from('tasks').select('*'),
      ])
      const goals = (gRes.data ?? []) as any[]
      const tasks = (tRes.data ?? []) as any[]
      const active = goals.filter((g: any) => g.status !== 'cancelled')
      const completed = active.filter((g: any) => g.status === 'completed')
      const doneTasks = tasks.filter((t: any) => t.done || t.status === 'done')
      const now = new Date()
      const overdue = tasks.filter(
        (t: any) =>
          t.due_date && new Date(t.due_date) < now && !t.done && t.status !== 'done',
      )
      return {
        total_goals: active.length,
        completed_goals: completed.length,
        goal_completion_rate:
          active.length > 0
            ? Math.round((completed.length / active.length) * 100)
            : 0,
        total_tasks: tasks.length,
        completed_tasks: doneTasks.length,
        task_completion_rate:
          tasks.length > 0
            ? Math.round((doneTasks.length / tasks.length) * 100)
            : 0,
        overdue_tasks: overdue.length,
        avg_goal_progress:
          active.length > 0
            ? Math.round(
                active.reduce((s: number, g: any) => s + (g.progress ?? 0), 0) /
                  active.length,
              )
            : 0,
      }
    }

    case 'create_task': {
      if (!args.title) return { error: '任务标题不能为空' }
      const insert: Record<string, unknown> = {
        title: String(args.title),
        status: 'todo',
        done: false,
      }
      if (args.priority) insert.priority = args.priority
      if (args.goal_id) insert.goal_id = args.goal_id
      if (args.due_date) insert.due_date = args.due_date
      const { data, error } = await supabase
        .from('tasks')
        .insert(insert)
        .select()
        .single()
      if (error) return { error: error.message }
      return data
    }

    case 'update_task': {
      if (!args.task_id) return { error: 'task_id 不能为空' }
      const updates: Record<string, unknown> = {}
      if (args.status !== undefined) updates.status = args.status
      if (args.title) updates.title = args.title
      if (args.priority) updates.priority = args.priority
      if (args.done !== undefined) updates.done = Boolean(args.done)
      if (Object.keys(updates).length === 0) return { error: '没有可更新的字段' }
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', args.task_id)
        .select()
        .single()
      if (error) return { error: error.message }
      return data
    }

    default:
      return { error: `未知工具: ${name}` }
  }
}

function isServerTool(name: string): boolean {
  return SERVER_TOOL_DEFS.some((t) => t.function.name === name)
}

// --- Main handler ---

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const body = await req.json()
    const { messages, model: requestedModel, stream, enableTools, tools } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const model = requestedModel || 'deepseek-v4-pro'
    const provider = detectProvider(model)
    const config = PROVIDERS[provider]

    if (!config) {
      return new Response(
        JSON.stringify({ error: `Unknown provider for model: ${model}` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_ANON_KEY') ??
      ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const apiKey = await getApiKey(supabase, config.envKey)

    // --- Demo mode: no API key available ---
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          text: '🤖 AI助手（演示模式）\n\n当前AI服务未配置API密钥，无法连接大语言模型。系统已自动切换到本地智能回复模式。\n\n如需启用AI功能，请在Supabase Edge Function设置中配置对应服务商的API密钥（支持DeepSeek、豆包、OpenAI、通义千问）。',
          demo: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    // --- Build merged tool list (server tools + client tools, deduped) ---
    const allTools: Array<Record<string, unknown>> = []
    if (enableTools) {
      allTools.push(...(SERVER_TOOL_DEFS as unknown as Array<Record<string, unknown>>))
      if (Array.isArray(tools)) {
        for (const t of tools) {
          const name = (t?.function?.name as string) ?? (t?.name as string)
          if (name && !isServerTool(name)) {
            allTools.push(t)
          }
        }
      }
    }

    // === Streaming path ===
    if (stream) {
      const llmBody: Record<string, unknown> = {
        model,
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }
      if (allTools.length > 0) {
        llmBody.tools = allTools
        llmBody.tool_choice = 'auto'
      }

      const llmResponse = await fetch(`${config.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(llmBody),
      })

      if (!llmResponse.ok) {
        const errText = await llmResponse.text().catch(() => 'Unknown error')
        console.error(`LLM streaming error ${llmResponse.status}: ${errText}`)
        return new Response(
          JSON.stringify({ error: `AI API error: ${llmResponse.status}` }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      return new Response(llmResponse.body, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // === Non-streaming path with server-side tool loop ===
    const currentMessages = [...messages]
    const MAX_TOOL_ROUNDS = 5
    const totalUsage = { prompt_tokens: 0, completion_tokens: 0 }

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const llmBody: Record<string, unknown> = {
        model,
        messages: currentMessages,
        temperature: 0.7,
        max_tokens: 4096,
      }
      if (allTools.length > 0) {
        llmBody.tools = allTools
        llmBody.tool_choice = 'auto'
      }

      const llmResponse = await fetch(`${config.endpoint}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(llmBody),
      })

      if (!llmResponse.ok) {
        const errText = await llmResponse.text().catch(() => 'Unknown error')
        console.error(`LLM API error ${llmResponse.status}: ${errText}`)
        return new Response(
          JSON.stringify({ error: `AI API error: ${llmResponse.status}` }),
          {
            status: 502,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      const json = await llmResponse.json()
      if (json.usage) {
        totalUsage.prompt_tokens += json.usage.prompt_tokens ?? 0
        totalUsage.completion_tokens += json.usage.completion_tokens ?? 0
      }

      const message = json.choices?.[0]?.message
      const toolCalls: Array<any> = message?.tool_calls ?? []

      // No tool calls -- return final text response
      if (toolCalls.length === 0) {
        const text = message?.content ?? ''
        return new Response(
          JSON.stringify({ text, usage: totalUsage }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      // Append assistant message with tool_calls to conversation
      currentMessages.push(message)

      // Execute server-side tools, collect client-side tools
      const clientToolCalls: Array<any> = []
      for (const tc of toolCalls) {
        const fnName: string = tc.function?.name ?? ''
        if (isServerTool(fnName)) {
          try {
            const args = JSON.parse(tc.function.arguments || '{}')
            const result = await executeServerTool(supabase, fnName, args)
            currentMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            })
          } catch (err) {
            currentMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify({ error: String(err) }),
            })
          }
        } else {
          clientToolCalls.push(tc)
        }
      }

      // Client-only tools: return them for client-side execution
      if (clientToolCalls.length > 0) {
        const mappedClientTCs = clientToolCalls.map((tc: any) => ({
          id: tc.id,
          function: {
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        }))
        return new Response(
          JSON.stringify({
            text: message?.content ?? '',
            usage: totalUsage,
            tool_calls: mappedClientTCs,
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        )
      }

      // All server tools executed -- loop continues for potential follow-up
    }

    // Max rounds reached -- force a final text response
    const finalBody: Record<string, unknown> = {
      model,
      messages: currentMessages,
      temperature: 0.7,
      max_tokens: 4096,
    }
    const finalResponse = await fetch(`${config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(finalBody),
    })

    if (!finalResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'AI API error after tool loop exhaustion' }),
        {
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const finalJson = await finalResponse.json()
    if (finalJson.usage) {
      totalUsage.prompt_tokens += finalJson.usage.prompt_tokens ?? 0
      totalUsage.completion_tokens += finalJson.usage.completion_tokens ?? 0
    }

    const text = finalJson.choices?.[0]?.message?.content ?? ''
    return new Response(
      JSON.stringify({ text, usage: totalUsage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
