import { type FC } from 'react';
import { useAppStore } from '@/stores/appStore';
import ChannelsView from '@/pages/collab/ChannelsView';
import ApprovalsView from '@/pages/collab/ApprovalsView';
import AnnouncementsView from '@/pages/collab/AnnouncementsView';
import TeamCalView from '@/pages/collab/TeamCalView';
import CollabDocsView from '@/pages/collab/CollabDocsView';
import MeetingsView from '@/pages/collab/MeetingsView';
import FilesView from '@/pages/collab/FilesView';
import DirectoryView from '@/pages/collab/DirectoryView';
import AiAgentsView from '@/pages/collab/AiAgentsView';
import ModulePageStub from '@/pages/ModulePageStub';

const COLLAB_MODULES: Record<string, { component: FC; title: string; icon: string; desc: string }> = {
  channels: { component: ChannelsView, title: '频道列表', icon: '#', desc: '' },
  teamCal: { component: TeamCalView, title: '团队日历', icon: '📅', desc: '团队日程与会议安排' },
  approvals: { component: ApprovalsView, title: '审批中心', icon: '📋', desc: '待审批与审批记录' },
  announcements: { component: AnnouncementsView, title: '公告板', icon: '📣', desc: '团队公告与通知' },
  collabDocs: { component: CollabDocsView, title: '协作文档', icon: '📄', desc: '团队实时协作文档' },
  meetings: { component: MeetingsView, title: '会议', icon: '🎥', desc: '会议安排与管理' },
  files: { component: FilesView, title: '文件共享', icon: '📎', desc: '团队文件管理与共享' },
  directory: { component: DirectoryView, title: '通讯录', icon: '👤', desc: '团队联系人与AI同事' },
  aiAgents: { component: AiAgentsView, title: 'AI同事', icon: '🤖', desc: 'AI同事管理与配置' },
};

export default function Collab() {
  const activeModule = useAppStore((s) => s.activeModule);
  const mod = COLLAB_MODULES[activeModule];

  if (mod) {
    const Content = mod.component;
    return <Content />;
  }

  return <ModulePageStub title={activeModule} icon='🚧' description='此模块正在开发中' />;
}
