import { useState, useCallback } from 'react';
import { useAppStore } from '@/stores/appStore';
import { INDUSTRIES, IND_COLORS, getDepartments } from '@/matrix/data';
import { useIndustryColor, useMatrixCell, useDepartments as useDepts } from '@/hooks/useMatrix';
import { cn } from '@/lib/utils';
import { X, Sparkles, ChevronRight, Bot, Loader2, Pencil } from 'lucide-react';
import { chatCompletion, buildSystemPrompt, type ChatMessage } from '@/lib/aiService';

interface AiMsg {
  role: 'ai' | 'user';
  text: string;
}

interface ChipOption {
  label: string;
  industry: string;
  dept: string;
  confidence: number;
}

/** Extended keyword mapping for industries not in the base 4 */
const INDUSTRY_ALIASES: Record<string, string> = {
  '汽车': '制造业',
  '电气': '制造业',
  '电子': '制造业',
  '半导体': '制造业',
  '化工': '制造业',
  '食品': '制造业',
  '医药': '制造业',
  '机械': '制造业',
  '航空': '制造业',
  '钢铁': '制造业',
  '建筑': '制造业',
  '服装': '制造业',
  '新能源': '制造业',
  '互联网': 'IT业',
  '软件': 'IT业',
  '科技': 'IT业',
  'AI': 'IT业',
  '人工智能': 'IT业',
  '银行': '金融行业',
  '保险': '金融行业',
  '证券': '金融行业',
  '基金': '金融行业',
  '信托': '金融行业',
  '学校': '教育行业',
  '大学': '教育行业',
  '培训': '教育行业',
  '在线教育': '教育行业',
};

/** Extended department keyword mapping — [industry, dept] */
const DEPT_KEYWORDS: Record<string, [string, string]> = {
  // Manufacturing variants
  '供应商': ['制造业', '供应商质量部'],
  '来料': ['制造业', '供应商质量部'],
  '质量': ['制造业', '供应商质量部'],
  '质量管理': ['制造业', '供应商质量部'],
  'QA': ['制造业', '供应商质量部'],
  'QC': ['制造业', '供应商质量部'],
  '检测': ['制造业', '工艺部'],
  '产线': ['制造业', '生产部'],
  'OEE': ['制造业', '生产部'],
  '生产': ['制造业', '生产部'],
  '工艺': ['制造业', '工艺部'],
  'CPK': ['制造业', '工艺部'],
  '设备': ['制造业', '设备部'],
  '点检': ['制造业', '设备部'],
  '仓储': ['制造业', '仓储部'],
  '安全': ['制造业', '安全部'],
  // "开发" in manufacturing context = 生产部 (not IT 研发部)
  // "产品开发" in manufacturing = 工艺部 (product R&D in mfg)
  // These are handled as multi-char keys below (matched first due to sort by length)
  // IT variants
  'PRD': ['IT业', '产品部'],
  '代码': ['IT业', '研发部'],
  '运营': ['IT业', '运营部'],
  '市场': ['IT业', '市场部'],
  // Education variants
  '教学': ['教育行业', '教学部'],
  '排课': ['教育行业', '教学部'],
  '教研': ['教育行业', '教研部'],
  '学工': ['教育行业', '学工部'],
  '招生': ['教育行业', '招生部'],
  '后勤': ['教育行业', '后勤部'],
  // Finance variants
  '风控': ['金融行业', '风控部'],
  '合规': ['金融行业', '合规部'],
  '前台': ['金融行业', '前台业务部'],
  '中台': ['金融行业', '中台支撑部'],
  '创新': ['金融行业', '产品创新部'],
};

/** Multi-word department keys — matched BEFORE single-char keys to avoid "产品开发" being split into "产品" + "开发" */
const MULTI_WORD_DEPT_KEYS: [string, string, string][] = [
  // [userText pattern, industry, dept]
  ['产品开发', '制造业', '工艺部'],
  ['研发', 'IT业', '研发部'],
  ['设计', 'IT业', '设计部'],
  ['产品', 'IT业', '产品部'],
];

/** AI command patterns that trigger UI state changes */
const UI_COMMANDS: { pattern: RegExp; action: (store: ReturnType<typeof useAppStore.getState>) => string }[] = [
  { pattern: /打开四象限|四象限模式|象限视图/, action: (s) => { s.setInterface('workspace'); s.setActiveModule('overview'); return '已切换到四象限总览视图'; } },
  { pattern: /切换到.*工作台|打开工作台|工作台模式/, action: (s) => { s.setInterface('workspace'); return '已切换到模块工作台'; } },
  { pattern: /切换到.*协作|打开协作台|协作台/, action: (s) => { s.setInterface('collab'); return '已切换到团队协作台'; } },
  { pattern: /切换到.*AI|打开AI台|AI台|个人AI/, action: (s) => { s.setInterface('ai'); return '已切换到个人AI台'; } },
  { pattern: /打开目标|目标管理|目标模块/, action: (s) => { s.setInterface('workspace'); s.setActiveModule('goals'); return '已打开目标管理模块'; } },
  { pattern: /打开任务|任务管理|任务模块|任务中心/, action: (s) => { s.setInterface('workspace'); s.setActiveModule('tasks'); return '已打开任务管理模块'; } },
  { pattern: /打开项目|项目管理|项目模块/, action: (s) => { s.setInterface('workspace'); s.setActiveModule('projects'); return '已打开项目管理模块'; } },
  { pattern: /打开成员|成员管理|成员列表/, action: (s) => { s.setInterface('workspace'); s.setActiveModule('members'); return '已打开成员管理模块'; } },
  { pattern: /打开知识|知识库|知识管理/, action: (s) => { s.setInterface('workspace'); s.setActiveModule('knowledge'); return '已打开知识管理模块'; } },
  { pattern: /打开甘特图|甘特图|项目甘特/, action: (s) => { s.setInterface('workspace'); s.setActiveModule('projects'); return '已打开项目甘特图'; } },
  { pattern: /切换行业|换个行业/, action: (s) => { const inds = INDUSTRIES; const next = inds[(inds.indexOf(s.industry) + 1) % inds.length]; s.setContext(next, getDepartments(next)[0]); return `已切换到「${next} · ${getDepartments(next)[0]}」`; } },
  { pattern: /收起侧栏|隐藏侧栏/, action: (s) => { if (s.modSidebarOpen) s.toggleModSidebar(); return '已收起侧栏'; } },
  { pattern: /展开侧栏|显示侧栏/, action: (s) => { if (!s.modSidebarOpen) s.toggleModSidebar(); return '已展开侧栏'; } },
];

function tryParseUICommand(text: string): { executed: boolean; reply?: string } {
  for (const cmd of UI_COMMANDS) {
    if (cmd.pattern.test(text)) {
      const reply = cmd.action(useAppStore.getState());
      return { executed: true, reply };
    }
  }
  return { executed: false };
}

export default function ContextPanel() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const setContext = useAppStore((s) => s.setContext);
  const toggleCtxPanel = useAppStore((s) => s.toggleCtxPanel);

  const [inputVal, setInputVal] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    { role: 'ai', text: '你好！告诉我你的工作内容，我来理解你的行业和岗位，为你定制专属体验。' },
  ]);
  const [chips, setChips] = useState<ChipOption[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [editingLayer, setEditingLayer] = useState<'vocab' | 'flow' | 'kpi' | null>(null);
  const [editValue, setEditValue] = useState('');

  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();

  const handleAiUnderstand = useCallback(async (userText: string) => {
    setIsThinking(true);
    setChips([]);

    const systemPrompt = [
      '你是一个"AI工作理解"助手，根据用户描述的工作内容，推断其所属行业和部门。',
      '',
      '## 映射规则',
      '- 汽车行业、电气行业、电子行业、半导体等均映射为"制造业"',
      '- 互联网、科技、软件行业均映射为"IT业"',
      '- 银行、保险、证券等均映射为"金融行业"',
      '- 学校、培训等均映射为"教育行业"',
      '',
      '## 可选行业和部门',
      ...INDUSTRIES.map((ind) => {
        const depts = getDepartments(ind);
        return `- ${ind}: ${depts.join('、')}`;
      }),
      '',
      '## 行业别名映射（用户可能使用的非标准行业名）',
      '汽车/电气/电子/半导体/化工/食品/医药/机械/航空/钢铁/建筑/新能源 → 制造业',
      '互联网/软件/科技/AI/人工智能 → IT业',
      '银行/保险/证券/基金/信托 → 金融行业',
      '学校/大学/培训/在线教育 → 教育行业',
      '',
      '## 回答格式（严格JSON）',
      '返回一个JSON数组，每项包含 label(对用户的推荐描述)、industry(行业名,必须是上述4个之一)、dept(部门名,必须是该行业下的部门)、confidence(0-1置信度)',
      '按置信度从高到低排列，最多返回3个。',
      '示例: [{"label":"制造业·供应商质量部","industry":"制造业","dept":"供应商质量部","confidence":0.9}]',
      '',
      '只返回JSON数组，不要任何其它文字。',
    ].join('\n');

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userText },
    ];

    try {
      const res = await chatCompletion(messages);
      const cleanText = res.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed: ChipOption[] = JSON.parse(cleanText);

      if (Array.isArray(parsed) && parsed.length > 0) {
        setChips(parsed.slice(0, 3));
        setAiMessages((prev) => [
          ...prev,
          { role: 'ai', text: '我理解了你的工作。请选择最匹配的上下文，或继续描述以便我更精准地匹配：' },
        ]);
      } else {
        throw new Error('Empty result');
      }
    } catch {
      const fallbackChips = localFallbackMatch(userText);
      if (fallbackChips.length > 0) {
        setChips(fallbackChips);
        setAiMessages((prev) => [
          ...prev,
          { role: 'ai', text: '我理解了你的工作。请选择最匹配的上下文：' },
        ]);
      } else {
        setAiMessages((prev) => [
          ...prev,
          { role: 'ai', text: '我还在学习中，能否更详细地描述你的工作内容？比如你所在的行业或负责的业务领域。' },
        ]);
      }
    } finally {
      setIsThinking(false);
    }
  }, []);

  function localFallbackMatch(text: string): ChipOption[] {
    const results: ChipOption[] = [];
    const lowerText = text.toLowerCase();

    // Step 0: Determine industry first (from direct name or alias)
    let detectedIndustry: string | null = null;

    // 0a: Direct industry name match
    for (const ind of INDUSTRIES) {
      const shortName = ind.replace('行业', '').replace('业', '');
      if (text.includes(shortName) || text.includes(ind)) {
        detectedIndustry = ind;
        break;
      }
    }

    // 0b: Industry alias match (e.g. "汽车" → "制造业")
    if (!detectedIndustry) {
      for (const [alias, targetInd] of Object.entries(INDUSTRY_ALIASES)) {
        if (text.includes(alias)) {
          detectedIndustry = targetInd;
          break;
        }
      }
    }

    // Step 1: Find matching department — context-aware
    let matchedDept: string | null = null;
    let matchedIndustry: string | null = detectedIndustry;

    // 1a: Try multi-word keys FIRST (e.g. "产品开发" before "产品")
    for (const [pattern, industry, dept] of MULTI_WORD_DEPT_KEYS) {
      if (text.includes(pattern)) {
        // If we already detected an industry, respect it but try to match dept
        if (detectedIndustry && detectedIndustry !== industry) {
          // Industry mismatch: "汽车行业产品开发部" → 制造业, but "产品开发" maps to IT业
          // In this case, keep the detected industry and find a dept within it
          const depts = getDepartments(detectedIndustry);
          // Try to find best matching dept in the detected industry
          const bestDept = depts.find(d => d.includes('工艺') || d.includes('产品') || d.includes('开发')) ?? depts[0];
          matchedDept = bestDept;
          matchedIndustry = detectedIndustry;
        } else {
          matchedDept = dept;
          matchedIndustry = industry;
        }
        break;
      }
    }

    // 1b: If no multi-word match, try single keywords
    if (!matchedDept) {
      for (const [kw, val] of Object.entries(DEPT_KEYWORDS)) {
        if (lowerText.includes(kw.toLowerCase())) {
          // If we already detected an industry, respect it
          if (detectedIndustry && detectedIndustry !== val[0]) {
            // Keyword maps to different industry — find equivalent in detected industry
            const depts = getDepartments(detectedIndustry);
            // e.g. "电气行业质量部": detectedIndustry=制造业, keyword "质量"→["制造业","供应商质量部"]
            const keywordTopic = val[1]; // e.g. "供应商质量部"
            const bestDept = depts.find(d =>
              keywordTopic.includes(d.replace(/部$/, '')) ||
              d.includes(keywordTopic.replace(/部$/, ''))
            ) ?? depts[0];
            matchedDept = bestDept;
            matchedIndustry = detectedIndustry;
          } else {
            matchedDept = val[1];
            matchedIndustry = val[0];
          }
          break;
        }
      }
    }

    // Build results from detected industry + dept
    if (matchedIndustry) {
      const depts = getDepartments(matchedIndustry);
      if (!matchedDept || !depts.includes(matchedDept)) {
        matchedDept = depts[0];
      }
      results.push({
        label: `${matchedIndustry} · ${matchedDept}`,
        industry: matchedIndustry,
        dept: matchedDept!,
        confidence: detectedIndustry === matchedIndustry ? 0.85 : 0.75,
      });
      // Add alternative departments
      const otherDepts = depts.filter(d => d !== matchedDept).slice(0, 2);
      for (const alt of otherDepts) {
        results.push({
          label: `${matchedIndustry} · ${alt}`,
          industry: matchedIndustry,
          dept: alt,
          confidence: 0.4,
        });
      }
      return results;
    }

    // Step 2: Department keyword only (no industry detected)
    for (const [kw, val] of Object.entries(DEPT_KEYWORDS)) {
      if (lowerText.includes(kw.toLowerCase())) {
        results.push({ label: `${val[0]} · ${val[1]}`, industry: val[0], dept: val[1], confidence: 0.7 });
        break;
      }
    }

    // Step 3: Ultimate fallback
    if (results.length === 0) {
      results.push(
        { label: 'IT业 · 产品部', industry: 'IT业', dept: '产品部', confidence: 0.4 },
        { label: '制造业 · 生产部', industry: '制造业', dept: '生产部', confidence: 0.3 },
      );
    }

    return results;
  }

  function handleSuggestionClick(text: string) {
    setAiMessages((prev) => [...prev, { role: 'user', text }]);
    handleAiUnderstand(text);
    setInputVal('');
  }

  function handleChipSelect(chip: ChipOption) {
    setContext(chip.industry, chip.dept);
    setAiMessages((prev) => [
      ...prev,
      { role: 'ai', text: `已切换到「${chip.industry} · ${chip.dept}」，界面、KPI、工作流和Agent已为你定制。` },
    ]);
    setChips([]);
  }

  function handleSubmit() {
    if (!inputVal.trim() || isThinking) return;
    const text = inputVal.trim();
    setAiMessages((prev) => [...prev, { role: 'user', text }]);
    setInputVal('');

    // Check for UI commands first
    const cmdResult = tryParseUICommand(text);
    if (cmdResult.executed && cmdResult.reply) {
      setAiMessages((prev) => [...prev, { role: 'ai', text: cmdResult.reply! }]);
      return;
    }

    handleAiUnderstand(text);
  }

  /** Handle clicking on a KPI/workflow tag to correct it */
  function handleLayerEdit(layer: 'vocab' | 'flow' | 'kpi', currentValue: string) {
    setEditingLayer(layer);
    setEditValue(currentValue);
  }

  function handleLayerSave() {
    // For now, send the correction as a conversation message
    if (!editValue.trim()) { setEditingLayer(null); return; }
    const layerLabel = editingLayer === 'vocab' ? '词汇层' : editingLayer === 'flow' ? '流程层' : '指标层';
    setAiMessages((prev) => [
      ...prev,
      { role: 'user', text: `请修正${layerLabel}：${editValue}` },
      { role: 'ai', text: `收到，我已记录你的${layerLabel}修正：「${editValue}」。后续分析会参考这个信息。` },
    ]);
    setEditingLayer(null);
    setEditValue('');
  }

  return (
    <div className="flex w-[380px] shrink-0 flex-col border-l border-border bg-surface z-40">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: indColor }} />
          <span className="text-sm font-bold">AI 理解你的工作</span>
        </div>
        <button onClick={toggleCtxPanel} className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text">
          <X size={16} />
        </button>
      </div>

      {/* Current Context */}
      <div className="border-b border-border px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">当前理解</div>
        <div className="flex items-center gap-2">
          <span className="rounded-md px-2 py-1 text-xs font-semibold" style={{ backgroundColor: indColor + '18', color: indColor }}>{industry}</span>
          <ChevronRight size={12} className="text-text-3" />
          <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-medium text-text">{dept}</span>
        </div>
      </div>

      {/* Understanding Layers — now with interactive correction */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">词汇层</span>
          <button onClick={() => handleLayerEdit('vocab', cell.kpis.slice(0, 3).map((k) => k.name).join(', '))} className="text-text-3 hover:text-primary-2 transition-colors"><Pencil size={10} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cell.kpis.slice(0, 3).map((kpi) => (
            <button key={kpi.name} onClick={() => handleLayerEdit('vocab', kpi.name)} className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-2 hover:bg-primary/10 hover:text-primary-2 transition-colors cursor-pointer">
              {kpi.name}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2 mt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">流程层</span>
          <button onClick={() => handleLayerEdit('flow', cell.workflow.join(' → '))} className="text-text-3 hover:text-primary-2 transition-colors"><Pencil size={10} /></button>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-text-2">
          {cell.workflow.map((step, i) => (
            <button key={step} onClick={() => handleLayerEdit('flow', step)} className="flex items-center gap-1 hover:text-primary-2 transition-colors cursor-pointer">
              <span className={cn(i === cell.wfCurrent && 'font-bold text-accent')}>{step}</span>
              {i < cell.workflow.length - 1 && <ChevronRight size={10} className="text-text-3" />}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2 mt-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-3">指标层</span>
          <button onClick={() => handleLayerEdit('kpi', cell.kpis.map((k) => `${k.name}: ${k.value}`).join(', '))} className="text-text-3 hover:text-primary-2 transition-colors"><Pencil size={10} /></button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {cell.kpis.map((kpi) => (
            <button key={kpi.name} onClick={() => handleLayerEdit('kpi', `${kpi.name}: ${kpi.value}`)} className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium hover:opacity-80 transition-opacity cursor-pointer', kpi.status === 'good' && 'bg-success/10 text-success', kpi.status === 'warn' && 'bg-warn/10 text-warn', kpi.status === 'bad' && 'bg-danger/10 text-danger')}>
              {kpi.name} {kpi.value}
            </button>
          ))}
        </div>

        {/* Inline edit for layer correction */}
        {editingLayer && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLayerSave()}
              placeholder={`修正${editingLayer === 'vocab' ? '词汇' : editingLayer === 'flow' ? '流程' : '指标'}...`}
              className="flex-1 rounded-lg border border-primary/50 bg-surface-2 px-2 py-1 text-[10px] text-text outline-none placeholder:text-text-3"
              autoFocus
            />
            <button onClick={handleLayerSave} className="rounded-md bg-primary px-2 py-1 text-[9px] font-semibold text-white">确认</button>
            <button onClick={() => setEditingLayer(null)} className="text-[9px] text-text-3 hover:text-text">取消</button>
          </div>
        )}
      </div>

      {/* AI Chat */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">对话设定</div>
        <div className="flex flex-col gap-2 mb-3">
          {aiMessages.map((msg, i) => (
            <div key={i} className={cn('rounded-lg px-3 py-2 text-xs leading-relaxed', msg.role === 'ai' ? 'bg-primary/10 text-primary-2' : 'bg-surface-2 text-text-2 ml-6')}>
              {msg.role === 'ai' && <Bot size={12} className="inline mr-1 opacity-50" />}
              {msg.text}
            </div>
          ))}
          {isThinking && (
            <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary-2">
              <Loader2 size={12} className="animate-spin" />
              <span>正在理解...</span>
            </div>
          )}
        </div>

        {/* Chip options */}
        {chips.length > 0 && (
          <div className="space-y-1.5 mb-2">
            <div className="text-[9px] font-bold uppercase tracking-wider text-text-3">选择你的上下文</div>
            {chips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleChipSelect(chip)}
                className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
              >
                <span className="rounded-md px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: (IND_COLORS[chip.industry] ?? '#7b6cf0') + '18', color: IND_COLORS[chip.industry] ?? '#7b6cf0' }}>
                  {Math.round(chip.confidence * 100)}%
                </span>
                <span className="text-xs font-medium text-text">{chip.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Suggestions — expanded */}
      <div className="border-t border-border px-4 py-2">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">快速描述</div>
        <div className="flex flex-wrap gap-1.5">
          {['打开目标', '打开任务', '打开甘特图', '切换到协作台', '切换到AI台', '切换行业', '汽车行业产品开发', '电气行业质量管理', '我负责供应商来料质量', '我是产品经理'].map((s) => (
            <button key={s} onClick={() => handleSuggestionClick(s)} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-3 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary-2" disabled={isThinking}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="描述你的工作..."
            aria-label="描述你的工作"
            className="flex-1 bg-transparent text-xs text-text outline-none placeholder:text-text-3"
            disabled={isThinking}
          />
          <button onClick={handleSubmit} className="rounded-md bg-primary px-2.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-50" disabled={isThinking}>
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
