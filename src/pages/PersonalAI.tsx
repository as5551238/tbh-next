import { useAppStore } from '@/stores/appStore';
import MorningView from '@/pages/ai/MorningView';
import RiskView from '@/pages/ai/RiskView';
import AgentListView from '@/pages/ai/AgentListView';
import AgentConfigView from '@/pages/ai/AgentConfigView';
import IndustryView from '@/pages/ai/IndustryView';
import WorkflowsView from '@/pages/ai/WorkflowsView';
import KpiDashView from '@/pages/ai/KpiDashView';
import SubscriptionView from '@/pages/ai/SubscriptionView';
import AgentMarketView from '@/pages/ai/AgentMarketView';
import KnowledgeOSPView from '@/pages/ai/KnowledgeOSPView';
import MCPA2AView from '@/pages/ai/MCPA2AView';
import MainChatView from '@/pages/MainChatView';
import ModulePageStub from '@/pages/ModulePageStub';

const AI_MODULES: Record<string, { component: React.FC; title: string; icon: string; desc: string }> = {
  main: { component: MainChatView, title: '工作助手', icon: '🧠', desc: '' },
  morning: { component: MorningView, title: '晨间聚焦', icon: '☀️', desc: 'AI晨间播报' },
  risk: { component: RiskView, title: '风险预警', icon: '⚠️', desc: '风险监控与预警' },
  agentList: { component: AgentListView, title: 'Agent列表', icon: '🤖', desc: 'AI Agent管理' },
  agentConfig: { component: AgentConfigView, title: 'Agent配置', icon: '🔧', desc: 'Agent参数设置' },
  industryView: { component: IndustryView, title: '行业视图', icon: '🏭', desc: '行业视角分析' },
  workflows: { component: WorkflowsView, title: '工作流模板', icon: '📐', desc: '工作流管理' },
  kpiDash: { component: KpiDashView, title: 'KPI仪表盘', icon: '📈', desc: 'KPI数据看板' },
  subscription: { component: SubscriptionView, title: '订阅管理', icon: '👑', desc: '方案与用量' },
  agentMarket: { component: AgentMarketView, title: 'Agent市场', icon: '🏪', desc: '发现与安装AI Agent' },
  knowledgeOSP: { component: KnowledgeOSPView, title: '行业知识库', icon: '📚', desc: '行业知识开放服务' },
  mcpA2a: { component: MCPA2AView, title: 'MCP & A2A', icon: '🔌', desc: '协议与Agent通信' },
};

export default function PersonalAI() {
  const activeModule = useAppStore((s) => s.activeModule);
  const mod = AI_MODULES[activeModule];
  if (mod) { const Content = mod.component; return <Content />; }
  return <ModulePageStub title={activeModule} icon='🚧' description='此模块正在开发中' />;
}
