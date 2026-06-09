/**
 * Industry Knowledge Open Service Platform (OSP).
 *
 * Provides industry-specific knowledge packs:
 * - Best practices & frameworks
 * - KPI benchmarks
 * - Workflow templates
 * - Compliance checklists
 * - Expert insights
 *
 * Each industry has a curated knowledge base that users can browse,
 * install, and contribute to. Pro/Enterprise users can create custom packs.
 */

import { isSupabaseConfigured } from '@/lib/supabase';

// --- Types ---

export interface KnowledgePack {
  id: string;
  industry: string;
  title: string;
  description: string;
  category: 'framework' | 'benchmark' | 'template' | 'checklist' | 'insight';
  categoryLabel: string;
  content: string;
  tags: string[];
  author: string;
  version: string;
  downloads: number;
  rating: number;
  isOfficial: boolean;
  isInstalled: boolean;
  plan: 'free' | 'pro' | 'enterprise';
  updatedAt: string;
}

export interface KnowledgeCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
}

// --- Categories ---

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { id: 'framework', label: '方法论框架', icon: '📐', description: '行业最佳实践与方法论' },
  { id: 'benchmark', label: '指标基准', icon: '📊', description: '行业KPI基准与对标数据' },
  { id: 'template', label: '流程模板', icon: '📋', description: '预置工作流与文档模板' },
  { id: 'checklist', label: '合规检查', icon: '✅', description: '行业合规与审计检查清单' },
  { id: 'insight', label: '专家洞察', icon: '💡', description: '行业专家深度分析与观点' },
];

// --- Knowledge packs (mock) ---

const KNOWLEDGE_PACKS: KnowledgePack[] = [
  {
    id: 'kp-it-agile',
    industry: 'IT业',
    title: 'Scrum 敏捷交付框架',
    description: '完整Scrum实施指南，含Sprint规划、回顾、看板配置',
    category: 'framework',
    categoryLabel: '方法论框架',
    content: '# Scrum 敏捷交付框架\n\n## 核心角色\n- Product Owner\n- Scrum Master\n- Development Team\n\n## Sprint 周期\n- 2周迭代\n- 每日站会15分钟\n- Sprint Review + Retro\n\n## 关键指标\n- Sprint完成率 ≥85%\n- 部署频率 ≥1次/天\n- 变更失败率 ≤10%',
    tags: ['敏捷', 'Scrum', '迭代'],
    author: 'TBH 官方',
    version: '3.2.0',
    downloads: 2341,
    rating: 4.9,
    isOfficial: true,
    isInstalled: true,
    plan: 'free',
    updatedAt: '2026-05-15',
  },
  {
    id: 'kp-it-kpi-benchmark',
    industry: 'IT业',
    title: '软件研发KPI基准 2026',
    description: 'DORA四关键指标行业基准数据，含P50/P75/P90分位',
    category: 'benchmark',
    categoryLabel: '指标基准',
    content: '# 软件研发KPI基准 2026\n\n| 指标 | P50 | P75 | P90 | 标杆 |\n|------|-----|-----|-----|------|\n| 部署频率 | 1次/周 | 1次/天 | 按需 | 按需 |\n| 变更失败率 | 15% | 10% | 5% | ≤5% |\n| MTTR | 1天 | 6小时 | 1小时 | ≤1小时 |\n| 变更前置时间 | 1月 | 1周 | 1天 | ≤1天 |',
    tags: ['DORA', 'KPI', '基准'],
    author: 'TBH 官方',
    version: '2026.1',
    downloads: 1876,
    rating: 4.8,
    isOfficial: true,
    isInstalled: false,
    plan: 'free',
    updatedAt: '2026-01-15',
  },
  {
    id: 'kp-manufacturing-oee',
    industry: '制造业',
    title: 'OEE 全面设备效率框架',
    description: '设备综合效率OEE计算方法、目标值与改善路径',
    category: 'framework',
    categoryLabel: '方法论框架',
    content: '# OEE 全面设备效率框架\n\n## OEE = 可用率 × 性能率 × 质量率\n\n### 世界级基准\n- 可用率: ≥90%\n- 性能率: ≥95%\n- 质量率: ≥99.9%\n- OEE综合: ≥85%\n\n### 六大损失\n1. 故障停机\n2. 换模调整\n3. 空转/短暂停机\n4. 速度降低\n5. 启动废品\n6. 生产废品',
    tags: ['OEE', '设备', '效率'],
    author: '制造智能工坊',
    version: '2.1.0',
    downloads: 1567,
    rating: 4.7,
    isOfficial: false,
    isInstalled: false,
    plan: 'free',
    updatedAt: '2026-03-20',
  },
  {
    id: 'kp-manufacturing-iqc',
    industry: '制造业',
    title: 'IQC来料检验标准模板',
    description: 'AQL抽样方案、检验项目清单、判定标准',
    category: 'template',
    categoryLabel: '流程模板',
    content: '# IQC来料检验标准模板\n\n## AQL抽样方案\n- 正常检验 Level II\n- AQL=0.65(关键) / 1.0(主要) / 2.5(次要)\n\n## 检验项目\n1. 外观检查\n2. 尺寸测量\n3. 功能测试\n4. 包装检查\n5. 标识核对',
    tags: ['IQC', '来料', '检验'],
    author: '制造智能工坊',
    version: '1.5.0',
    downloads: 1234,
    rating: 4.6,
    isOfficial: false,
    isInstalled: false,
    plan: 'pro',
    updatedAt: '2026-04-10',
  },
  {
    id: 'kp-finance-risk',
    industry: '金融行业',
    title: '巴塞尔协议III合规检查清单',
    description: '资本充足率、流动性覆盖率、杠杆率合规要点',
    category: 'checklist',
    categoryLabel: '合规检查',
    content: '# 巴塞尔协议III合规检查清单\n\n## 资本充足率\n- [ ] 核心一级资本充足率 ≥4.5%\n- [ ] 一级资本充足率 ≥6%\n- [ ] 总资本充足率 ≥8%\n- [ ] 资本留存缓冲 ≥2.5%\n\n## 流动性\n- [ ] 流动性覆盖率(LCR) ≥100%\n- [ ] 净稳定资金比率(NSFR) ≥100%',
    tags: ['巴塞尔', '合规', '资本'],
    author: '金融科技AI',
    version: '1.2.0',
    downloads: 987,
    rating: 4.8,
    isOfficial: false,
    isInstalled: false,
    plan: 'enterprise',
    updatedAt: '2026-02-28',
  },
  {
    id: 'kp-education-teaching',
    industry: '教育行业',
    title: '教学评估PDCA循环框架',
    description: '教学质量持续改进的PDCA模型与量表',
    category: 'framework',
    categoryLabel: '方法论框架',
    content: '# 教学评估PDCA循环框架\n\n## Plan(计划)\n- 制定教学目标\n- 设计评估标准\n- 规划教学活动\n\n## Do(执行)\n- 实施教学\n- 收集过程数据\n- 学生反馈\n\n## Check(检查)\n- 成绩分析\n- 满意度调查\n- 对标基准\n\n## Act(改进)\n- 识别改进点\n- 优化教学方案\n- 进入下一循环',
    tags: ['PDCA', '教学', '评估'],
    author: '教育创新Lab',
    version: '1.0.0',
    downloads: 654,
    rating: 4.5,
    isOfficial: false,
    isInstalled: false,
    plan: 'free',
    updatedAt: '2026-05-01',
  },
];

// --- Fetch ---

export async function fetchKnowledgePacks(industry?: string): Promise<KnowledgePack[]> {
  if (!isSupabaseConfigured() || !supabase) {
    return industry ? KNOWLEDGE_PACKS.filter((p) => p.industry === industry) : KNOWLEDGE_PACKS;
  }

  const { fetchKnowledgePacks: dlFetch } = await import('@/lib/dataLayer');
  const rows = await dlFetch(industry);
  if (!rows.length) return industry ? KNOWLEDGE_PACKS.filter((p) => p.industry === industry) : KNOWLEDGE_PACKS;
  return rows.map(mapDbToPack);
}

function mapDbToPack(row: Record<string, unknown>): KnowledgePack {
  const cat = row.category as string ?? 'framework';
  const catObj = KNOWLEDGE_CATEGORIES.find((c) => c.id === cat);
  return {
    id: row.id as string,
    industry: row.industry as string ?? 'IT业',
    title: row.title as string,
    description: row.description as string ?? '',
    category: cat as KnowledgePack['category'],
    categoryLabel: catObj?.label ?? cat,
    content: row.content as string ?? '',
    tags: row.tags as string[] ?? [],
    author: row.author as string ?? '',
    version: row.version as string ?? '1.0.0',
    downloads: row.downloads as number ?? 0,
    rating: row.rating as number ?? 0,
    isOfficial: row.is_official as boolean ?? false,
    isInstalled: row.is_installed as boolean ?? false,
    plan: row.plan as 'free' | 'pro' | 'enterprise' ?? 'free',
    updatedAt: row.updated_at as string ?? '',
  };
}
