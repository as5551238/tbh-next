/**
 * Agent Marketplace data types and services.
 *
 * Agent catalog is driven by a JSON config file (data/marketplace-agents.json),
 * making it easy to add/remove agents without changing code.
 * When Supabase is configured and the `marketplace_agents` table has data,
 * the DB version takes priority.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import defaultAgents from '@/data/marketplace-agents.json';

// --- Types ---

export interface MarketplaceAgent {
  id: string;
  name: string;
  icon: string;
  author: string;
  authorAvatar: string;
  category: string;         // 'productivity' | 'analytics' | 'automation' | 'communication' | 'industry'
  industry?: string;        // optional industry specialization
  description: string;
  longDescription: string;
  version: string;
  downloads: number;
  rating: number;
  reviewCount: number;
  tags: string[];
  systemPrompt: string;
  capabilities: string[];
  isOfficial: boolean;      // built-in vs community
  isInstalled: boolean;
  price: 'free' | 'pro' | 'enterprise';
}

// --- Local marketplace data (loaded from JSON config) ---

const MARKETPLACE_AGENTS: MarketplaceAgent[] = (defaultAgents as Array<Omit<MarketplaceAgent, 'authorAvatar'>>).map(
  (a) => ({ ...a, authorAvatar: a.author?.[0]?.toUpperCase() ?? '?' })
);

const CATEGORIES = [
  { id: 'all', label: '全部', icon: '🏪' },
  { id: 'productivity', label: '生产力', icon: '⚡' },
  { id: 'analytics', label: '数据分析', icon: '📊' },
  { id: 'automation', label: '自动化', icon: '⚙️' },
  { id: 'communication', label: '沟通协作', icon: '💬' },
  { id: 'industry', label: '行业专精', icon: '🏭' },
];

// --- Fetch marketplace ---

export async function fetchMarketplaceAgents(): Promise<MarketplaceAgent[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return MARKETPLACE_AGENTS;
  }

  const { data, error } = await supabase
    .from('marketplace_agents')
    .select('*')
    .order('downloads', { ascending: false });

  if (error || !data?.length) return MARKETPLACE_AGENTS;

  return data.map(mapDbToAgent);
}

function mapDbToAgent(row: Record<string, unknown>): MarketplaceAgent {
  return {
    id: row.id as string,
    name: row.name as string,
    icon: row.icon as string ?? '🤖',
    author: row.author as string ?? '',
    authorAvatar: (row.author as string)?.[0]?.toUpperCase() ?? '?',
    category: row.category as string ?? 'productivity',
    industry: row.industry as string | undefined,
    description: row.description as string ?? '',
    longDescription: row.long_description as string ?? '',
    version: row.version as string ?? '1.0.0',
    downloads: row.downloads as number ?? 0,
    rating: row.rating as number ?? 0,
    reviewCount: row.review_count as number ?? 0,
    tags: row.tags as string[] ?? [],
    systemPrompt: row.system_prompt as string ?? '',
    capabilities: row.capabilities as string[] ?? [],
    isOfficial: row.is_official as boolean ?? false,
    isInstalled: row.is_installed as boolean ?? false,
    price: row.price as 'free' | 'pro' | 'enterprise' ?? 'free',
  };
}

export { CATEGORIES };
