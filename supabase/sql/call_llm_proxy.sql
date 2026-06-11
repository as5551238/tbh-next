-- ═══════════════════════════════════════════════════════════════════
-- call_llm_proxy — Server-side LLM proxy (keeps API keys out of client)
-- ═══════════════════════════════════════════════════════════════════
-- SECURITY: API keys stay server-side only, never exposed to client bundle.
-- 
-- NOTE: Due to Supabase's PgBouncer connection pooling, the pg_net
-- polling loop may not see worker responses within the same PL/pgSQL
-- function call. For reliable server-side AI proxying, deploy the
-- Edge Function (supabase/functions/ai-chat/) via Supabase Dashboard.
--
-- Deployment:
--   1. Copy this SQL into Supabase Dashboard → SQL Editor → Run
--   2. Deploy Edge Function via Dashboard:
--      - Navigate to Edge Functions → Create new function "ai-chat"
--      - Paste code from supabase/functions/ai-chat/index.ts
--      - Set DEEPSEEK_API_KEY secret
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists pg_net schema extensions;

create or replace function call_llm_proxy(p_messages jsonb, p_model text default 'deepseek-chat')
returns jsonb
language plpgsql
security definer
as $$
declare
  request_id bigint;
  sc int;
  ct text;
  to_flag boolean;
  api_key text;
  endpoint_url text;
  provider text;
  attempts int := 0;
  body_json jsonb;
begin
  provider := case
    when p_model like 'deepseek%' then 'deepseek'
    when p_model like 'doubao%' then 'doubao'
    when p_model like 'gpt%' then 'openai'
    when p_model like 'qwen%' then 'qwen'
    else 'deepseek'
  end;

  -- API key is stored server-side only (never sent to client)
  -- Replace with your actual key or use Supabase Vault
  api_key := 'REPLACE_WITH_YOUR_API_KEY';

  endpoint_url := case provider
    when 'deepseek' then 'https://api.deepseek.com/chat/completions'
    when 'doubao' then 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
    when 'openai' then 'https://api.openai.com/v1/chat/completions'
    when 'qwen' then 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
    else 'https://api.deepseek.com/chat/completions'
  end;

  select into request_id net.http_post(
    url := endpoint_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || api_key
    ),
    body := jsonb_build_object(
      'model', p_model,
      'messages', p_messages,
      'max_tokens', 2048
    ),
    timeout_milliseconds := 30000
  );

  if request_id is null then
    return jsonb_build_object('error', 'Failed to create HTTP request');
  end if;

  -- Poll for response (may hit PgBouncer snapshot limits on Supabase hosted)
  loop
    attempts := attempts + 1;
    if attempts > 60 then
      return jsonb_build_object('error', 'Timeout', 'text', '[AI请求超时，请配置Edge Function代理]');
    end if;
    perform pg_sleep(0.5);
    select status_code, content, timed_out into sc, ct, to_flag
    from net._http_response where id = request_id;
    if sc is not null or to_flag is not null then
      exit;
    end if;
  end loop;

  if ct is null or ct = '' then
    return jsonb_build_object('status_code', sc, 'error', 'Empty response');
  end if;

  body_json := ct::jsonb;

  if body_json ? 'choices' and jsonb_array_length(body_json->'choices') > 0 then
    return jsonb_build_object(
      'text', body_json->'choices'->0->'message'->>'content',
      'usage', body_json->'usage',
      'model', body_json->>'model'
    );
  end if;

  if body_json ? 'error' then
    return jsonb_build_object(
      'error', body_json->'error'->>'message',
      'text', '[AI: ' || (body_json->'error'->>'message') || ']'
    );
  end if;

  return jsonb_build_object('text', '');
end;
$$;

grant execute on function call_llm_proxy(jsonb, text) to authenticated;
grant execute on function call_llm_proxy(jsonb, text) to anon;
