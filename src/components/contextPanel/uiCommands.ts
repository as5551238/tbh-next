import { useAppStore } from '@/stores/appStore';
import { INDUSTRIES, getDepartments } from '@/matrix/data';

export const UI_COMMANDS: { pattern: RegExp; action: (store: ReturnType<typeof useAppStore.getState>) => [string, string?] }[] = [
  { pattern: /打开四象限|四象限模式|象限视图/, action: (s) => { const path = s.navigateTo('workspace', 'overview'); return ['已切换到四象限总览视图', path]; } },
  { pattern: /切换到.*工作台|打开工作台|工作台模式/, action: (s) => { const path = s.navigateTo('workspace'); return ['已切换到模块工作台', path]; } },
  { pattern: /切换到.*协作|打开协作台|协作台/, action: (s) => { const path = s.navigateTo('collab'); return ['已切换到团队协作台', path]; } },
  { pattern: /切换到.*AI|打开AI台|AI台|个人AI/, action: (s) => { const path = s.navigateTo('ai'); return ['已切换到个人AI台', path]; } },
  { pattern: /打开目标|目标管理|目标模块/, action: (s) => { const path = s.navigateTo('workspace', 'goals'); return ['已打开目标管理模块', path]; } },
  { pattern: /打开任务|任务管理|任务模块|任务中心/, action: (s) => { const path = s.navigateTo('workspace', 'tasks'); return ['已打开任务管理模块', path]; } },
  { pattern: /打开项目|项目管理|项目模块/, action: (s) => { const path = s.navigateTo('workspace', 'projects'); return ['已打开项目管理模块', path]; } },
  { pattern: /打开成员|成员管理|成员列表/, action: (s) => { const path = s.navigateTo('workspace', 'members'); return ['已打开成员管理模块', path]; } },
  { pattern: /打开知识|知识库|知识管理/, action: (s) => { const path = s.navigateTo('workspace', 'knowledge'); return ['已打开知识管理模块', path]; } },
  { pattern: /打开甘特图|甘特图|项目甘特/, action: (s) => { const path = s.navigateTo('workspace', 'projects'); return ['已打开项目甘特图', path]; } },
  { pattern: /切换行业|换个行业/, action: (s) => { const inds = INDUSTRIES; const next = inds[(inds.indexOf(s.industry) + 1) % inds.length]; s.setContext(next, getDepartments(next)[0]); return [`已切换到「${next} · ${getDepartments(next)[0]}」`]; } },
  { pattern: /收起侧栏|隐藏侧栏/, action: (s) => { if (s.modSidebarOpen) s.toggleModSidebar(); return ['已收起侧栏']; } },
  { pattern: /展开侧栏|显示侧栏/, action: (s) => { if (!s.modSidebarOpen) s.toggleModSidebar(); return ['已展开侧栏']; } },
];

export function tryParseUICommand(text: string): { executed: boolean; reply?: string; navigateTo?: string } {
  for (const cmd of UI_COMMANDS) {
    if (cmd.pattern.test(text)) {
      const [reply, path] = cmd.action(useAppStore.getState());
      return { executed: true, reply, navigateTo: path };
    }
  }
  return { executed: false };
}
