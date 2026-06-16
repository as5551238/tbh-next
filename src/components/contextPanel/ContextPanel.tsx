import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { getAllIndustries, getDepartments, getIndustryColor } from '@/matrix/data';
import { IND_COLORS } from '@/matrix/data';
import { useIndustryColor, useMatrixCell } from '@/hooks/useMatrix';
import { X, Sparkles, ChevronRight, Wand2 } from 'lucide-react';
import { chatCompletion, buildSystemPrompt, type ChatMessage } from '@/lib/aiService';
import { generateMatrixCellAI, saveCustomCell, getColorForIndustry } from '@/lib/matrixGenerator';
import type { AiMsg, ChipOption } from './types';
import { tryParseUICommand } from './uiCommands';
import { localFallbackMatch } from './matching';
import { UnderstandingLayers } from './UnderstandingLayers';
import { AiChatMessages } from './AiChatMessages';

export default function ContextPanel() {
  const industry = useAppStore((s) => s.industry);
  const dept = useAppStore((s) => s.dept);
  const setContext = useAppStore((s) => s.setContext);
  const toggleCtxPanel = useAppStore((s) => s.toggleCtxPanel);
  const navigate = useNavigate();

  const [inputVal, setInputVal] = useState('');
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([
    { role: 'ai', text: '你好！告诉我你的工作内容，我来理解你的行业和岗位，为你定制专属体验。' },
  ]);
  const [chips, setChips] = useState<ChipOption[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [editingLayer, setEditingLayer] = useState<'vocab' | 'flow' | 'kpi' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [cocreateMode, setCocreateMode] = useState(false);
  const [cocreateIndustry, setCocreateIndustry] = useState('');
  const [cocreateDept, setCocreateDept] = useState('');
  const [lastUserInput, setLastUserInput] = useState('');

  const indColor = useIndustryColor();
  const { cell, loading } = useMatrixCell();

  const handleAiUnderstand = useCallback(async (userText: string) => {
    setIsThinking(true);
    setChips([]);
    setLastUserInput(userText);

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
       ...getAllIndustries().map((ind) => {
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
       '返回一个JSON数组，每项包含 label(对用户的推荐描述)、industry(行业名)、dept(部门名)、confidence(0-1置信度)、isNew(布尔值,行业不在上述列表中时为true)',
       '按置信度从高到低排列，最多返回3个。',
       '当用户的行业不在上述列表中时，industry可以为用户描述的实际行业名（如"医疗器械"），isNew设为true。',
       '示例: [{"label":"医疗器械·质量部","industry":"医疗器械","dept":"质量部","confidence":0.9,"isNew":true}]',
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

  function handleSuggestionClick(text: string) {
    setAiMessages((prev) => [...prev, { role: 'user', text }]);
    handleAiUnderstand(text);
    setInputVal('');
  }

  function handleChipSelect(chip: ChipOption) {
    if (chip.isNew) {
      handleCocreate(chip.industry, chip.dept);
      return;
    }
    setContext(chip.industry, chip.dept, lastUserInput, lastUserInput);
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

    const cmdResult = tryParseUICommand(text);
    if (cmdResult.executed && cmdResult.reply) {
      setAiMessages((prev) => [...prev, { role: 'ai', text: cmdResult.reply! }]);
      if (cmdResult.navigateTo) {
        navigate(cmdResult.navigateTo);
      }
      return;
    }

    handleAiUnderstand(text);
  }

  function handleLayerEdit(layer: 'vocab' | 'flow' | 'kpi', currentValue: string) {
    setEditingLayer(layer);
    setEditValue(currentValue);
  }

  function handleLayerSave() {
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

  const handleCocreate = useCallback(async (industry: string, dept: string) => {
    if (!industry.trim() || !dept.trim()) return;
    setIsThinking(true);
    setCocreateMode(false);
    setAiMessages((prev) => [
      ...prev,
      { role: 'user', text: `我是${industry}的${dept}，请为我定制业务视图` },
      { role: 'ai', text: `正在为你生成「${industry} · ${dept}」的专属业务视图...` },
    ]);

    try {
      const cell = await generateMatrixCellAI(industry, dept);
      const color = getColorForIndustry(industry, IND_COLORS);
      saveCustomCell({ industry, dept, cell, color, createdAt: new Date().toISOString() });

      setContext(industry, dept, `${industry}${dept}`, `${industry}${dept}`);
      setAiMessages((prev) => [
        ...prev,
        { role: 'ai', text: `✅ 「${industry} · ${dept}」专属视图已生成！\n\n已为你定制：\n- ${cell.kpis.length}个行业KPI\n- ${cell.workflow.length}步业务流程\n- ${cell.agents.length}个专属AI Agent\n- ${cell.top3.length}条预警项\n\n界面已切换，你可以开始使用了。` },
      ]);
    } catch {
      setAiMessages((prev) => [
        ...prev,
        { role: 'ai', text: '生成失败，请重试。你也可以先选择相近的行业，后续再调整。' },
      ]);
    } finally {
      setIsThinking(false);
    }
  }, [setContext]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleCtxPanel} />
      <div className="fixed inset-y-0 right-0 w-full md:w-[320px] lg:w-[380px] md:relative md:inset-auto shrink-0 flex-col border-l border-border bg-surface z-50 md:z-40 flex">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} style={{ color: indColor }} />
          <span className="text-sm font-bold">AI 理解你的工作</span>
        </div>
        <button onClick={toggleCtxPanel} aria-label="关闭面板" className="flex h-7 w-7 items-center justify-center rounded-lg text-text-3 transition-colors hover:bg-surface-2 hover:text-text">
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

      {/* Understanding Layers */}
      <UnderstandingLayers
        cell={cell}
        editingLayer={editingLayer}
        editValue={editValue}
        onLayerEdit={handleLayerEdit}
        onLayerSave={handleLayerSave}
        onEditValueChange={setEditValue}
        onCancelEdit={() => setEditingLayer(null)}
      />

      {/* AI Chat */}
      <AiChatMessages
        messages={aiMessages}
        isThinking={isThinking}
        chips={chips}
        onChipSelect={handleChipSelect}
      />

      {/* AI Cocreate: Manual industry+dept input */}
      {cocreateMode && (
        <div className="border-t border-border px-4 py-3 bg-accent/5">
          <div className="flex items-center gap-2 mb-2">
            <Wand2 size={12} className="text-accent" />
            <span className="text-[10px] font-bold text-accent">AI 共创新行业视图</span>
          </div>
          <input
            type="text"
            value={cocreateIndustry}
            onChange={(e) => setCocreateIndustry(e.target.value)}
            placeholder="输入行业名，如：医疗器械"
            aria-label="行业名称"
            className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs text-text outline-none placeholder:text-text-3 mb-2"
          />
          <input
            type="text"
            value={cocreateDept}
            onChange={(e) => setCocreateDept(e.target.value)}
            placeholder="输入部门名，如：质量管理部"
            aria-label="部门名称"
            className="w-full rounded-lg border border-border bg-surface-2 px-2 py-1.5 text-xs text-text outline-none placeholder:text-text-3 mb-2"
          />
          <div className="flex items-center gap-2">
            <button onClick={() => handleCocreate(cocreateIndustry, cocreateDept)} disabled={!cocreateIndustry.trim() || !cocreateDept.trim() || isThinking} className="rounded-md bg-accent px-2.5 py-1 text-[10px] font-semibold text-white transition-opacity hover:opacity-80 disabled:opacity-40">
              生成专属视图
            </button>
            <button onClick={() => setCocreateMode(false)} className="text-[10px] text-text-3 hover:text-text">取消</button>
          </div>
        </div>
      )}

      {/* Quick Suggestions */}
      <div className="border-t border-border px-4 py-2">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-3">快速描述</div>
        <div className="flex flex-wrap gap-1.5">
          {['打开目标', '打开任务', '打开甘特图', '切换到协作台', '切换到AI台', '切换行业', '汽车行业产品开发', '电气行业质量管理', '我负责供应商来料质量', '我是产品经理'].map((s) => (
            <button key={s} onClick={() => handleSuggestionClick(s)} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-3 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary-2" disabled={isThinking}>
              {s}
            </button>
          ))}
          <button onClick={() => setCocreateMode(true)} className="flex items-center gap-1 rounded-full border border-accent/30 px-2 py-0.5 text-[10px] text-accent transition-all hover:border-accent/60 hover:bg-accent/10" disabled={isThinking}>
            <Wand2 size={8} />共创新行业
          </button>
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
    </>
  );
}
