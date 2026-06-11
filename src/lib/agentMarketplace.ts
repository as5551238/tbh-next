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

// --- Local marketplace data ---

const MARKETPLACE_AGENTS: MarketplaceAgent[] = [
  {
    id: 'ma-morning-brief',
    name: '晨报助手',
    icon: '☀️',
    author: 'TBH 官方',
    authorAvatar: 'T',
    category: 'productivity',
    description: '每日晨间播报，待办聚焦，风险速览',
    longDescription: '基于你的行业和部门数据，自动生成每日晨间播报。包含KPI状态概览、待办优先级排序、风险预警速览和行动建议。支持自定义播报时间。',
    version: '2.1.0',
    downloads: 1234,
    rating: 4.8,
    reviewCount: 56,
    tags: ['晨报', '播报', '生产力'],
    systemPrompt: '你是晨报助手...',
    capabilities: ['晨间摘要生成', '待办优先级排序', '风险速览', '行动建议'],
    isOfficial: true,
    isInstalled: true,
    price: 'free',
  },
  {
    id: 'ma-progress-tracker',
    name: '进度追踪',
    icon: '📊',
    author: 'TBH 官方',
    authorAvatar: 'T',
    category: 'analytics',
    description: 'KPI分析，目标进度，趋势预测',
    longDescription: '实时追踪KPI达标率，预测目标完成时间，识别效率瓶颈。支持自定义指标看板和告警阈值。数据驱动，精准决策。',
    version: '2.1.0',
    downloads: 987,
    rating: 4.6,
    reviewCount: 42,
    tags: ['KPI', '进度', '分析'],
    systemPrompt: '你是进度追踪助手...',
    capabilities: ['KPI达标率分析', '目标进度追踪', '趋势变化预警', '效率瓶颈定位'],
    isOfficial: true,
    isInstalled: true,
    price: 'free',
  },
  {
    id: 'ma-risk-monitor',
    name: '风险监控',
    icon: '🛡️',
    author: 'TBH 官方',
    authorAvatar: 'T',
    category: 'analytics',
    description: '风险识别，预警推送，应对方案',
    longDescription: '7x24小时风险监控，自动识别项目延期、资源瓶颈、合规风险。基于历史数据预测风险走向，推荐具体应对方案和升级策略。',
    version: '2.1.0',
    downloads: 856,
    rating: 4.7,
    reviewCount: 38,
    tags: ['风险', '预警', '监控'],
    systemPrompt: '你是风险监控助手...',
    capabilities: ['风险等级评估', '预警推送', '应对方案推荐', '历史模式分析'],
    isOfficial: true,
    isInstalled: true,
    price: 'free',
  },
  {
    id: 'ma-meeting-summarizer',
    name: '会议纪要专家',
    icon: '📝',
    author: '高效协作Lab',
    authorAvatar: 'H',
    category: 'productivity',
    description: '智能会议纪要，行动项提取，决议跟踪',
    longDescription: '支持语音/文字输入，自动生成结构化会议纪要。提取行动项并关联负责人和截止日期。决议自动同步到任务系统。支持多语言会议。',
    version: '1.3.2',
    downloads: 645,
    rating: 4.5,
    reviewCount: 28,
    tags: ['会议', '纪要', '行动项'],
    systemPrompt: '你是会议纪要专家...',
    capabilities: ['会议纪要生成', '行动项提取', '决议跟踪', '多语言支持'],
    isOfficial: false,
    isInstalled: false,
    price: 'free',
  },
  {
    id: 'ma-competitor-scout',
    name: '竞品侦探',
    icon: '🔍',
    author: '市场洞察AI',
    authorAvatar: 'M',
    category: 'analytics',
    industry: 'IT业',
    description: '竞品动态监控，功能对比，市场策略建议',
    longDescription: '持续监控竞品产品更新、定价策略、用户评价。自动生成竞品对比矩阵和市场策略建议。支持定时报告和异常提醒。',
    version: '1.1.0',
    downloads: 423,
    rating: 4.3,
    reviewCount: 19,
    tags: ['竞品', '市场', '监控'],
    systemPrompt: '你是竞品侦探...',
    capabilities: ['竞品动态监控', '功能对比分析', '定价策略追踪', '市场趋势洞察'],
    isOfficial: false,
    isInstalled: false,
    price: 'pro',
  },
  {
    id: 'ma-supplier-quality',
    name: '供应商质量智控',
    icon: '🏭',
    author: '制造智能工坊',
    authorAvatar: 'Z',
    category: 'industry',
    industry: '制造业',
    description: 'IQC分析，供应商评分，来料异常预警',
    longDescription: '专业IQC统计分析，自动计算PPM/Cpk，供应商动态评分。基于历史数据预测来料异常风险。支持AQL抽样方案自动生成。',
    version: '2.0.1',
    downloads: 312,
    rating: 4.9,
    reviewCount: 15,
    tags: ['供应商', 'IQC', '质量'],
    systemPrompt: '你是供应商质量智控助手...',
    capabilities: ['IQC统计分析', 'PPM/Cpk计算', '供应商动态评分', '来料异常预警'],
    isOfficial: false,
    isInstalled: false,
    price: 'pro',
  },
  {
    id: 'ma-compliance-guardian',
    name: '合规卫士',
    icon: '⚖️',
    author: '金融科技AI',
    authorAvatar: 'F',
    category: 'industry',
    industry: '金融行业',
    description: '合规检查，政策解读，审计准备',
    longDescription: '针对金融行业合规要求，自动检查业务流程合规性。实时解读最新监管政策，生成审计准备清单和支持材料。支持多地区法规。',
    version: '1.5.0',
    downloads: 278,
    rating: 4.6,
    reviewCount: 12,
    tags: ['合规', '金融', '审计'],
    systemPrompt: '你是合规卫士...',
    capabilities: ['合规性自动检查', '监管政策解读', '审计清单生成', '风险评估'],
    isOfficial: false,
    isInstalled: false,
    price: 'enterprise',
  },
  {
    id: 'ma-workflow-automator',
    name: '流程自动化工匠',
    icon: '⚙️',
    author: 'TBH 官方',
    authorAvatar: 'T',
    category: 'automation',
    description: '自定义工作流，跨系统自动化，条件触发',
    longDescription: '可视化设计工作流，支持条件分支、定时触发、Webhook集成。跨Supabase/企业微信/邮件等多系统自动化。预置20+工作流模板。',
    version: '1.0.0',
    downloads: 567,
    rating: 4.4,
    reviewCount: 23,
    tags: ['工作流', '自动化', '模板'],
    systemPrompt: '你是流程自动化工匠...',
    capabilities: ['可视化工作流设计', '条件分支/循环', '多系统集成', '预置模板'],
    isOfficial: true,
    isInstalled: false,
    price: 'pro',
  },
];

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
