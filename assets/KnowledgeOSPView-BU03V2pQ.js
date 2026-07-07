import{r as c,j as e,w as Q,b as q,E as B,as as G,D as M,d as U,aQ as H,X as V,ag as W}from"./vendor-Db-FVUbi.js";import{_ as $,b as X,e as y,q as L}from"./index-J9lhzwU3.js";import{u as J,T as Y}from"./useToast-COqifUFC.js";import{l as Z,s as E,bC as _,bD as T,bE as ee}from"./data-layer-CTyNoswm.js";import{C as te}from"./ModuleErrorBoundary-BPSQEyaj.js";import{P as se}from"./PaywallModal-7bmqh_Qe.js";import{u as ne}from"./usePersistedState-Biew9k_I.js";import{t as a}from"./i18n-CCi7zJx1.js";import"./router-dZTcPTfr.js";import"./state-Bq4bD6eC.js";import"./ui-utils-Bbg69IUi.js";import"./sentry-fbL9e17o.js";import"./supabase-CAgrU3kV.js";import"./payment-BEGDBfRo.js";const S=[{id:"framework",label:"方法论框架",icon:"📐",description:"行业最佳实践与方法论"},{id:"benchmark",label:"指标基准",icon:"📊",description:"行业KPI基准与对标数据"},{id:"template",label:"流程模板",icon:"📋",description:"预置工作流与文档模板"},{id:"checklist",label:"合规检查",icon:"✅",description:"行业合规与审计检查清单"},{id:"insight",label:"专家洞察",icon:"💡",description:"行业专家深度分析与观点"}],j=[{id:"kp-it-agile",industry:"IT业",title:"Scrum 敏捷交付框架",description:"完整Scrum实施指南，含Sprint规划、回顾、看板配置",category:"framework",categoryLabel:"方法论框架",content:`# Scrum 敏捷交付框架

## 核心角色
- Product Owner
- Scrum Master
- Development Team

## Sprint 周期
- 2周迭代
- 每日站会15分钟
- Sprint Review + Retro

## 关键指标
- Sprint完成率 ≥85%
- 部署频率 ≥1次/天
- 变更失败率 ≤10%`,tags:["敏捷","Scrum","迭代"],author:"TBH 官方",version:"3.2.0",downloads:2341,rating:4.9,isOfficial:!0,isInstalled:!0,plan:"free",updatedAt:"2026-05-15"},{id:"kp-it-kpi-benchmark",industry:"IT业",title:"软件研发KPI基准 2026",description:"DORA四关键指标行业基准数据，含P50/P75/P90分位",category:"benchmark",categoryLabel:"指标基准",content:`# 软件研发KPI基准 2026

| 指标 | P50 | P75 | P90 | 标杆 |
|------|-----|-----|-----|------|
| 部署频率 | 1次/周 | 1次/天 | 按需 | 按需 |
| 变更失败率 | 15% | 10% | 5% | ≤5% |
| MTTR | 1天 | 6小时 | 1小时 | ≤1小时 |
| 变更前置时间 | 1月 | 1周 | 1天 | ≤1天 |`,tags:["DORA","KPI","基准"],author:"TBH 官方",version:"2026.1",downloads:1876,rating:4.8,isOfficial:!0,isInstalled:!1,plan:"free",updatedAt:"2026-01-15"},{id:"kp-manufacturing-oee",industry:"制造业",title:"OEE 全面设备效率框架",description:"设备综合效率OEE计算方法、目标值与改善路径",category:"framework",categoryLabel:"方法论框架",content:`# OEE 全面设备效率框架

## OEE = 可用率 × 性能率 × 质量率

### 世界级基准
- 可用率: ≥90%
- 性能率: ≥95%
- 质量率: ≥99.9%
- OEE综合: ≥85%

### 六大损失
1. 故障停机
2. 换模调整
3. 空转/短暂停机
4. 速度降低
5. 启动废品
6. 生产废品`,tags:["OEE","设备","效率"],author:"制造智能工坊",version:"2.1.0",downloads:1567,rating:4.7,isOfficial:!1,isInstalled:!1,plan:"free",updatedAt:"2026-03-20"},{id:"kp-manufacturing-iqc",industry:"制造业",title:"IQC来料检验标准模板",description:"AQL抽样方案、检验项目清单、判定标准",category:"template",categoryLabel:"流程模板",content:`# IQC来料检验标准模板

## AQL抽样方案
- 正常检验 Level II
- AQL=0.65(关键) / 1.0(主要) / 2.5(次要)

## 检验项目
1. 外观检查
2. 尺寸测量
3. 功能测试
4. 包装检查
5. 标识核对`,tags:["IQC","来料","检验"],author:"制造智能工坊",version:"1.5.0",downloads:1234,rating:4.6,isOfficial:!1,isInstalled:!1,plan:"pro",updatedAt:"2026-04-10"},{id:"kp-finance-risk",industry:"金融行业",title:"巴塞尔协议III合规检查清单",description:"资本充足率、流动性覆盖率、杠杆率合规要点",category:"checklist",categoryLabel:"合规检查",content:`# 巴塞尔协议III合规检查清单

## 资本充足率
- [ ] 核心一级资本充足率 ≥4.5%
- [ ] 一级资本充足率 ≥6%
- [ ] 总资本充足率 ≥8%
- [ ] 资本留存缓冲 ≥2.5%

## 流动性
- [ ] 流动性覆盖率(LCR) ≥100%
- [ ] 净稳定资金比率(NSFR) ≥100%`,tags:["巴塞尔","合规","资本"],author:"金融科技AI",version:"1.2.0",downloads:987,rating:4.8,isOfficial:!1,isInstalled:!1,plan:"enterprise",updatedAt:"2026-02-28"},{id:"kp-education-teaching",industry:"教育行业",title:"教学评估PDCA循环框架",description:"教学质量持续改进的PDCA模型与量表",category:"framework",categoryLabel:"方法论框架",content:`# 教学评估PDCA循环框架

## Plan(计划)
- 制定教学目标
- 设计评估标准
- 规划教学活动

## Do(执行)
- 实施教学
- 收集过程数据
- 学生反馈

## Check(检查)
- 成绩分析
- 满意度调查
- 对标基准

## Act(改进)
- 识别改进点
- 优化教学方案
- 进入下一循环`,tags:["PDCA","教学","评估"],author:"教育创新Lab",version:"1.0.0",downloads:654,rating:4.5,isOfficial:!1,isInstalled:!1,plan:"free",updatedAt:"2026-05-01"}];async function ae(n,o){if(!Z()||!E){let l=n?j.filter(r=>r.industry===n):j;if(o){const r=o.toLowerCase();l=l.filter(s=>s.title.toLowerCase().includes(r)||s.description.toLowerCase().includes(r)||s.tags.some(u=>u.toLowerCase().includes(r)))}return l}const{fetchKnowledgePacks:p,fetchInstalledPacks:m}=await $(async()=>{const{fetchKnowledgePacks:l,fetchInstalledPacks:r}=await import("./data-layer-CTyNoswm.js").then(s=>s.bG);return{fetchKnowledgePacks:l,fetchInstalledPacks:r}},[]);let d=E.from("knowledge_packs").select("*");n&&(d=d.eq("industry",n)),o&&(d=d.or(`title.ilike.%${o}%,description.ilike.%${o}%`)),d=d.order("downloads",{ascending:!1});const{data:w,error:b}=await d;if(b||!w?.length){let l=n?j.filter(r=>r.industry===n):j;if(o){const r=o.toLowerCase();l=l.filter(s=>s.title.toLowerCase().includes(r)||s.description.toLowerCase().includes(r)||s.tags.some(u=>u.toLowerCase().includes(r)))}return l}const h=await m(),P=new Set(h.map(l=>l.pack_id));return w.map(l=>le(l,P))}function le(n,o){const p=n.category??"framework",m=S.find(d=>d.id===p);return{id:n.id,industry:n.industry??"IT业",title:n.title,description:n.description??"",category:p,categoryLabel:m?.label??p,content:n.content??"",tags:n.tags??[],author:n.author??"",version:n.version??"1.0.0",downloads:n.downloads??0,rating:n.rating??0,isOfficial:n.is_official??!1,isInstalled:o?o.has(n.id):!1,plan:n.plan??"free",updatedAt:n.updated_at??""}}function ye(){const[n,o]=c.useState(!1),p=X(t=>t.industry),[m,d]=c.useState([]),[w,b]=c.useState(!0),[h,P]=c.useState(""),[l,r]=c.useState("all"),[s,u]=c.useState(null),[v,D]=c.useState(!1),{toasts:K,success:N,error:k}=J(),[I,O]=ne("tbh-installed-packs",new Set),[C,A]=c.useState(null);c.useEffect(()=>{const t=setTimeout(()=>{ae(v?void 0:p,h||void 0).then(i=>{d(i),b(!1)}).catch(i=>{console.error("[knowledge]",i),k(a("knowledgeOSP.loadFailed")),b(!1)})},300);return()=>clearTimeout(t)},[p,v,h]);const R=m.filter(t=>!(l!=="all"&&t.category!==l));async function z(t,i){i.stopPropagation(),A(t.id);try{await _({industry:t.industry,title:t.title,description:t.description,category:t.category,content:t.content,tags:t.tags,author:t.author,version:t.version,downloads:t.downloads,rating:t.rating,is_official:t.isOfficial,plan:t.plan,updated_at:t.updatedAt});const g=new Set(I);g.add(t.id),O(g);try{await T(t.id)}catch{}d(x=>x.map(f=>f.id===t.id?{...f,isInstalled:!0}:f)),N(a("knowledgeOSP.importSuccess",{title:t.title}))}catch{k(a("knowledgeOSP.importFailed",{title:t.title}))}finally{A(null)}}async function F(){if(!s)return;const t=s.id,i=!s.isInstalled;if(i&&s.plan==="pro"&&!L("ai_knowledge_osp")){o(!0);return}if(i&&s.plan==="enterprise"&&!L("ai_knowledge_osp")){o(!0);return}try{i?(await _({industry:s.industry,title:s.title,description:s.description,category:s.category,content:s.content,tags:s.tags,author:s.author,version:s.version,downloads:s.downloads,rating:s.rating,is_official:s.isOfficial,plan:s.plan,updated_at:s.updatedAt}),await T(t)):await ee(t)}catch(x){console.warn("[knowledge] Supabase install toggle failed, updating locally:",x)}const g=new Set(I);i?g.add(t):g.delete(t),O(g),d(x=>x.map(f=>f.id===t?{...f,isInstalled:i}:f)),u(x=>x?{...x,isInstalled:i}:null),N(i?a("knowledgeOSP.installSuccess",{title:s.title}):a("knowledgeOSP.uninstallSuccess",{title:s.title}))}return e.jsxs("div",{className:"flex h-full",children:[e.jsx(Y,{toasts:K}),e.jsxs("div",{className:"flex flex-1 flex-col min-w-0",children:[e.jsxs("div",{className:"flex flex-wrap items-center gap-3 border-b border-border px-4 py-3",children:[e.jsx(Q,{size:16,className:"text-primary-2"}),e.jsx("span",{className:"text-sm font-bold",children:a("knowledgeOSP.title")}),e.jsx("span",{className:"text-[10px] text-text-3",children:a("knowledgeOSP.packCount",{count:m.length})}),e.jsxs("label",{className:"ml-auto flex flex-wrap items-center gap-1.5 text-[10px] text-text-3 cursor-pointer",children:[e.jsx("input",{type:"checkbox",id:"show-all-industries",checked:v,onChange:t=>D(t.target.checked),className:"rounded"}),e.jsx("label",{htmlFor:"show-all-industries",className:"text-[10px] text-text-3 cursor-pointer",children:a("knowledgeOSP.allIndustries")})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2 rounded-lg bg-surface-2 px-3 py-1.5",children:[e.jsx(q,{size:13,className:"text-text-3"}),e.jsx("input",{type:"text",value:h,onChange:t=>P(t.target.value),placeholder:a("knowledgeOSP.searchPlaceholder"),"aria-label":a("knowledgeOSP.searchAria"),className:"bg-transparent text-xs text-text outline-none placeholder:text-text-3 w-28"})]})]}),e.jsxs("div",{className:"flex flex-wrap gap-1.5 border-b border-border px-4 py-2 overflow-x-auto",children:[e.jsx("button",{onClick:()=>r("all"),className:y("rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap",l==="all"?"bg-primary/10 text-primary-2 font-semibold":"bg-surface-2 text-text-3 hover:text-text"),children:a("knowledgeOSP.all")}),S.map(t=>e.jsxs("button",{onClick:()=>r(t.id),className:y("flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-medium transition-all whitespace-nowrap",l===t.id?"bg-primary/10 text-primary-2 font-semibold":"bg-surface-2 text-text-3 hover:text-text"),children:[e.jsx("span",{children:t.icon})," ",t.label]},t.id))]}),e.jsx("div",{className:"flex-1 overflow-y-auto p-3 md:p-4 space-y-2",children:w?e.jsx(te,{}):R.map(t=>e.jsxs("button",{onClick:()=>u(t),className:y("flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all hover:shadow-lg",t.isInstalled?"border-success/30 bg-success/5 hover:border-success/50":"border-border bg-surface hover:border-primary/30"),children:[e.jsx("div",{className:"flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-lg shrink-0",children:S.find(i=>i.id===t.category)?.icon??"📚"}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsxs("div",{className:"flex flex-wrap items-center gap-2 mb-0.5",children:[e.jsx("span",{className:"text-xs font-bold text-text truncate",children:t.title}),t.isOfficial&&e.jsx("span",{className:"rounded bg-primary/10 px-1 py-[1px] text-[7px] font-bold text-primary-2",children:a("knowledgeOSP.official")}),t.isInstalled&&e.jsxs("span",{className:"flex flex-wrap items-center gap-0.5 rounded bg-success/10 px-1 py-[1px] text-[7px] font-bold text-success",children:[e.jsx(B,{size:7}),a("knowledgeOSP.installedBadge")]})]}),e.jsx("p",{className:"text-[10px] text-text-3 truncate",children:t.description}),e.jsxs("div",{className:"flex flex-wrap items-center gap-3 text-[9px] text-text-3 mt-1",children:[e.jsx("span",{className:"rounded bg-surface-2 px-1.5 py-0.5",children:t.industry}),e.jsx("span",{children:t.categoryLabel}),e.jsxs("span",{className:"flex flex-wrap items-center gap-0.5",children:[e.jsx(G,{size:8,className:"text-warn fill-warn"}),t.rating]}),e.jsxs("span",{className:"flex flex-wrap items-center gap-0.5",children:[e.jsx(M,{size:8}),t.downloads]})]}),!t.isInstalled&&e.jsxs("button",{onClick:i=>z(t,i),className:"mt-2 w-full rounded-lg bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary-2 hover:bg-primary/20 disabled:opacity-50",disabled:C===t.id,children:[C===t.id?e.jsx(U,{size:10,className:"animate-spin inline mr-1"}):e.jsx(H,{size:9,className:"inline mr-1"}),a("knowledgeOSP.importBtn")]})]})]},t.id))})]}),s&&e.jsxs("div",{className:"flex w-full md:w-[360px] lg:w-[420px] shrink-0 flex-col border-l border-border bg-surface",children:[e.jsxs("div",{className:"flex items-center justify-between border-b border-border px-4 py-3",children:[e.jsx("span",{className:"text-sm font-bold",children:s.categoryLabel}),e.jsx("button",{onClick:()=>u(null),"aria-label":a("knowledgeOSP.closeAria"),className:"flex h-7 w-7 items-center justify-center rounded-lg text-text-3 hover:bg-surface-2",children:e.jsx(V,{size:14})})]}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-3 md:p-4 space-y-4",children:[e.jsxs("div",{children:[e.jsx("h3",{className:"text-base font-extrabold text-text",children:s.title}),e.jsxs("p",{className:"text-xs text-text-3 mt-1",children:[s.author," · v",s.version," · ",s.updatedAt]})]}),e.jsxs("div",{className:"flex flex-wrap items-center gap-4",children:[e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"text-lg font-bold text-text",children:s.rating}),e.jsx("div",{className:"text-[9px] text-text-3",children:a("knowledgeOSP.rating")})]}),e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"text-lg font-bold text-text",children:s.downloads}),e.jsx("div",{className:"text-[9px] text-text-3",children:a("knowledgeOSP.downloads")})]})]}),e.jsx("div",{className:"rounded-xl bg-surface-2 p-3 md:p-4",children:e.jsx("div",{className:"text-xs text-text-2 leading-relaxed whitespace-pre-line font-mono",children:s.content})}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex flex-wrap items-center gap-1 text-[10px] font-bold text-text-3 mb-1.5",children:[e.jsx(W,{size:10}),a("knowledgeOSP.tags")]}),e.jsx("div",{className:"flex flex-wrap gap-1.5",children:s.tags.map(t=>e.jsxs("span",{className:"rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary-2",children:["#",t]},t))})]})]}),e.jsx("div",{className:"border-t border-border p-3 md:p-4",children:e.jsx("button",{onClick:F,className:y("w-full rounded-xl py-3 text-sm font-bold transition-all",s.isInstalled?"bg-success/10 text-success border border-success/20 hover:bg-success/20":"bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg hover:shadow-primary/20"),children:s.isInstalled?a("knowledgeOSP.installedClickUninstall"):s.plan==="free"?a("knowledgeOSP.freeInstall"):a("knowledgeOSP.planUnlock",{plan:s.plan==="pro"?a("knowledgeOSP.pro"):a("knowledgeOSP.enterprise")})})})]}),e.jsx(se,{open:n,onClose:()=>o(!1),reason:a("knowledgeOSP.paywallReason"),feature:"ai_knowledge_osp"})]})}export{ye as default};
