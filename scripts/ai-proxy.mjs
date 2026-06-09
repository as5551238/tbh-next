#!/usr/bin/env node
/**
 * Local AI Proxy — replaces Supabase Edge Function for development.
 * Runs on port 3789, forwards AI requests to DeepSeek/Doubao/etc.
 * 
 * Usage: node scripts/ai-proxy.mjs
 * Then set VITE_AI_PROXY_URL=http://localhost:3789 in .env
 */

import http from 'http';
import https from 'https';

const PORT = 3789;

const PROVIDERS = {
  deepseek: { endpoint: 'https://api.deepseek.com', key: 'sk-4b9f9700f9924aeeb165a4f63678d396' },
  doubao: { endpoint: 'https://ark.cn-beijing.volces.com/api/v3', key: 'api-key-20260606235421' },
  openai: { endpoint: 'https://api.openai.com', key: '' },
  qwen: { endpoint: 'https://dashscope.aliyuncs.com/compatible-mode', key: '' },
};

function detectProvider(model) {
  if (model.startsWith('deepseek')) return 'deepseek';
  if (model.startsWith('doubao')) return 'doubao';
  if (model.startsWith('gpt')) return 'openai';
  if (model.startsWith('qwen')) return 'qwen';
  return 'deepseek';
}

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  try {
    const { messages, model: requestedModel, stream, enableTools, tools } = JSON.parse(body);
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Messages array is required' }));
      return;
    }

    const model = requestedModel || 'deepseek-v4-pro';
    const provider = detectProvider(model);
    const config = PROVIDERS[provider];

    if (!config || !config.key) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Provider ${provider} not configured` }));
      return;
    }

    const llmBody = { model, messages, stream: !!stream, temperature: 0.7, max_tokens: 4096 };
    if (enableTools && tools?.length > 0) {
      llmBody.tools = tools;
      llmBody.tool_choice = 'auto';
    }

    const llmResponse = await fetch(`${config.endpoint}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.key}` },
      body: JSON.stringify(llmBody),
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text().catch(() => '');
      console.error(`LLM error ${llmResponse.status}: ${errText.slice(0, 200)}`);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `AI API error: ${llmResponse.status}` }));
      return;
    }

    if (stream) {
      // Forward SSE stream
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      const reader = llmResponse.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch (e) {
        console.error('Stream error:', e.message);
      }
      res.end();
    } else {
      const json = await llmResponse.json();
      const message = json.choices?.[0]?.message;
      const text = message?.content ?? '';
      const usage = json.usage ? { prompt_tokens: json.usage.prompt_tokens, completion_tokens: json.usage.completion_tokens } : undefined;
      const toolCalls = message?.tool_calls?.map(tc => ({ id: tc.id, function: { name: tc.function.name, arguments: tc.function.arguments } }));
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ text, usage, tool_calls: toolCalls }));
    }
  } catch (err) {
    console.error('Proxy error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal proxy error' }));
  }
});

server.listen(PORT, () => {
  console.log(`AI Proxy running on http://localhost:${PORT}`);
  console.log('Providers: deepseek (DeepSeek V4 Pro), doubao (豆包)');
});
