/**
 * Industry Template Wizard — guided setup for new teams.
 *
 * Provides industry-specific preset goals, tasks, milestones and review models.
 * User picks industry → picks template → auto-creates goals + tasks.
 *
 * DR-51: Template suggestions are optional (skip available)
 * DR-52: Manual creation always available as fallback
 * DR-53: Template selection auto-generates at least one goal + task
 */

import type { GoalRow, TaskRow } from '@/lib/dataLayer/types';
import type { ReviewModel } from '@/lib/reviewEngine';
import { REVIEW_MODELS } from '@/lib/reviewEngine';

// ─── Types ───

export interface IndustryTemplate {
  id: string;
  industry: string;
  name: string;
  description: string;
  presetGoals: Array<{
    title: string;
    keyResults: string[];
    priority: string;
  }>;
  presetTasks: Array<{
    title: string;
    priority: string;
    category: string;
  }>;
  reviewModel: ReviewModel['id'];
  milestones: string[];
}

// ─── Built-in Templates ───

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'tpl_it_sprint',
    industry: '信息技术',
    name: '敏捷Sprint模板',
    description: '适用于2周迭代周期，含Sprint目标、站会任务和迭代复盘',
    presetGoals: [
      { title: 'Sprint交付目标', keyResults: ['完成所有P0需求', '0个P1以上Bug遗留', '代码审查覆盖率80%'], priority: 'high' },
      { title: '技术债务清理', keyResults: ['重构2个核心模块', '测试覆盖率达到70%'], priority: 'medium' },
    ],
    presetTasks: [
      { title: 'Sprint计划会议', priority: 'high', category: 'meeting' },
      { title: '每日站会(15min)', priority: 'medium', category: 'meeting' },
      { title: '代码审查', priority: 'high', category: 'development' },
      { title: 'Sprint回顾', priority: 'high', category: 'review' },
      { title: '部署验证', priority: 'high', category: 'development' },
    ],
    reviewModel: 'grai',
    milestones: ['Sprint开始', '中期检查', 'Sprint结束复盘'],
  },
  {
    id: 'tpl_product_launch',
    industry: '信息技术',
    name: '产品上线模板',
    description: '适用于新功能/产品上线，含灰度发布、QA验证和用户反馈',
    presetGoals: [
      { title: '产品成功上线', keyResults: ['灰度发布完成100%', '核心功能可用率99.9%', '首日0 P0故障'], priority: 'critical' },
      { title: '用户反馈收集', keyResults: ['收集100条用户反馈', 'NPS≥40'], priority: 'medium' },
    ],
    presetTasks: [
      { title: '功能冻结', priority: 'critical', category: 'milestone' },
      { title: 'QA全量回归', priority: 'critical', category: 'testing' },
      { title: '灰度10%发布', priority: 'high', category: 'deployment' },
      { title: '灰度50%发布', priority: 'high', category: 'deployment' },
      { title: '全量发布', priority: 'critical', category: 'deployment' },
      { title: '用户反馈分析', priority: 'medium', category: 'analytics' },
    ],
    reviewModel: 'pdca',
    milestones: ['功能冻结', 'QA通过', '灰度发布', '全量发布', '上线复盘'],
  },
  {
    id: 'tpl_okr_quarter',
    industry: '通用',
    name: 'OKR季度模板',
    description: '标准季度OKR模板，适合任何行业的目标管理',
    presetGoals: [
      { title: 'Q1核心目标', keyResults: ['KR1: 量化指标1', 'KR2: 量化指标2', 'KR3: 量化指标3'], priority: 'high' },
    ],
    presetTasks: [
      { title: 'OKR对齐会议', priority: 'high', category: 'meeting' },
      { title: '月度进度检查', priority: 'medium', category: 'review' },
      { title: '季度复盘', priority: 'high', category: 'review' },
    ],
    reviewModel: 'grai',
    milestones: ['OKR定义', '月度检查', '季度复盘'],
  },
  {
    id: 'tpl_sales_quarter',
    industry: '销售',
    name: '销售季度冲刺模板',
    description: '含销售额目标、客户拓展和Pipeline管理',
    presetGoals: [
      { title: '季度销售目标', keyResults: ['签约金额达到XX万', '新客户开发XX家', '续约率≥85%'], priority: 'critical' },
    ],
    presetTasks: [
      { title: 'Pipeline梳理', priority: 'high', category: 'pipeline' },
      { title: '客户拜访计划', priority: 'high', category: 'customer' },
      { title: '周销售会议', priority: 'medium', category: 'meeting' },
      { title: '季度销售复盘', priority: 'high', category: 'review' },
    ],
    reviewModel: 'pdca',
    milestones: ['月初Pipeline', '月度检查', '季度复盘'],
  },
];

// ─── Helper ───

export function getTemplatesForIndustry(industry: string): IndustryTemplate[] {
  const exact = INDUSTRY_TEMPLATES.filter((t) => t.industry === industry);
  const generic = INDUSTRY_TEMPLATES.filter((t) => t.industry === '通用');
  return [...exact, ...generic];
}
