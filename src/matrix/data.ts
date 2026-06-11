export interface KPI {
  name: string;
  value: string;
  target: string;
  status: 'good' | 'warn' | 'bad';
  trend: 'up' | 'down' | 'flat';
}

export interface Agent {
  name: string;
  desc: string;
  status: string;
}

export interface MatrixCell {
  kpis: KPI[];
  workflow: string[];
  wfCurrent: number;
  top3: { text: string; level: 'danger' | 'warn' | 'info' }[];
  morning: string;
  agents: Agent[];
  channels: string[];
  ribbon: string;
  nextStep: string;
}

export type MatrixData = Record<string, Record<string, MatrixCell>>;

export const MATRIX: MatrixData = {
  'IT业': {
    '产品部': {
      kpis: [
        { name: '需求交付周期', value: '13天', target: '≤15天', status: 'good', trend: 'flat' },
        { name: 'PRD通过率', value: '82%', target: '≥80%', status: 'good', trend: 'up' },
        { name: '功能使用率', value: '58%', target: '≥60%', status: 'warn', trend: 'down' },
        { name: 'NPS', value: '42', target: '≥45', status: 'warn', trend: 'down' },
      ],
      workflow: ['需求采集', '优先级排序', 'PRD编写', '评审', '排入迭代', '验收'],
      wfCurrent: 3,
      top3: [
        { text: 'Q3路线图评审明天截止，3个需求待确认', level: 'danger' },
        { text: '"导出功能"使用率仅12%，需评估优化', level: 'warn' },
        { text: '3个PRD本周进入评审，建议统一标准', level: 'info' },
      ],
      morning: '今天是Q3路线图评审截止日，3个待确认需求需你决策。导出功能使用率仅12%，建议优先评估优化方案。',
      agents: [
        { name: '产品分析师', desc: 'PRD与需求分析', status: '在线' },
        { name: '竞品侦探', desc: '竞品动态监控', status: '在线' },
        { name: '数据看门人', desc: '功能使用率追踪', status: '分析中' },
      ],
      channels: ['产品-需求讨论', '产品-PRD评审', '产品-用户反馈', '产品-数据看板'],
      ribbon: '需求交付13天 ✓ · 功能使用率58% ⚠',
      nextStep: '评审',
    },
    '研发部': {
      kpis: [
        { name: '部署频率', value: '1.2次/天', target: '≥1/天', status: 'good', trend: 'up' },
        { name: '变更失败率', value: '8%', target: '≤10%', status: 'good', trend: 'flat' },
        { name: 'MTTR', value: '22min', target: '≤30min', status: 'good', trend: 'up' },
        { name: 'Sprint完成率', value: '72%', target: '≥85%', status: 'warn', trend: 'down' },
      ],
      workflow: ['需求领取', '开发', 'Code Review', '测试', '部署', '监控'],
      wfCurrent: 4,
      top3: [
        { text: '今晚22:00生产部署，涉及2个服务', level: 'danger' },
        { text: 'Sprint燃尽图偏移15%，建议调整范围', level: 'warn' },
        { text: '技术债务新增3项，累计12项', level: 'info' },
      ],
      morning: '今晚22:00有生产部署，请提前通知QA。Sprint燃尽图偏移15%，建议今日站会调整范围。',
      agents: [
        { name: '代码审查员', desc: '自动Code Review', status: '在线' },
        { name: 'DevOps助手', desc: 'CI/CD与部署', status: '待命' },
      ],
      channels: ['研发-站会', '研发-Code Review', '研发-发布', '研发-技术债务'],
      ribbon: '部署1.2次/天 ✓ · Sprint完成率72% ⚠',
      nextStep: '部署',
    },
    '设计部': {
      kpis: [
        { name: '设计覆盖率', value: '76%', target: '≥80%', status: 'warn', trend: 'up' },
        { name: '走查通过率', value: '92%', target: '≥90%', status: 'good', trend: 'flat' },
        { name: '规范偏离率', value: '8%', target: '≤10%', status: 'good', trend: 'down' },
      ],
      workflow: ['需求', '设计', '评审', '交付', '走查'],
      wfCurrent: 2,
      top3: [
        { text: '设计系统12个组件待完成（周五截止）', level: 'warn' },
        { text: '3个页面走查发现规范偏离', level: 'danger' },
        { text: '竞品分析报告已产出', level: 'info' },
      ],
      morning: '设计系统12个组件待完成，周五截止。3个页面规范偏离需协调。',
      agents: [{ name: '设计管家', desc: '设计系统维护', status: '在线' }],
      channels: ['设计-作品集', '设计-规范讨论', '设计-走查反馈'],
      ribbon: '覆盖率76% ⚠ · 走查92% ✓',
      nextStep: '设计',
    },
    '运营部': {
      kpis: [
        { name: 'DAU', value: '48.5万', target: '≥50万', status: 'warn', trend: 'down' },
        { name: '转化率', value: '3.8%', target: '≥3.5%', status: 'good', trend: 'up' },
        { name: 'D7留存', value: '42%', target: '≥40%', status: 'good', trend: 'flat' },
      ],
      workflow: ['数据监控', '问题定位', '方案设计', '执行', '复盘'],
      wfCurrent: 1,
      top3: [
        { text: 'DAU连续2日微降-2.3%需关注', level: 'danger' },
        { text: '新注册流A/B转化率+18%！', level: 'info' },
        { text: '用户分层V2完成待策略匹配', level: 'warn' },
      ],
      morning: 'DAU连续2日微降需关注。好消息：新注册流A/B转化率+18%！',
      agents: [{ name: '增长分析师', desc: '数据驱动增长', status: '在线' }],
      channels: ['运营-数据日报', '运营-增长实验', '运营-用户运营'],
      ribbon: 'DAU 48.5万 ⚠ · 转化率3.8% ✓',
      nextStep: '问题定位',
    },
    '市场部': {
      kpis: [
        { name: 'MQL数量', value: '136/200', target: '≥200/月', status: 'warn', trend: 'down' },
        { name: 'CAC', value: '520元', target: '≤500元', status: 'bad', trend: 'up' },
        { name: 'ROI', value: '2.8', target: '≥3.0', status: 'warn', trend: 'down' },
      ],
      workflow: ['线索获取', '筛选', '培育', '转化', '复盘'],
      wfCurrent: 2,
      top3: [
        { text: 'MQL达成率68%需加速投放', level: 'danger' },
        { text: 'CAC升至520元超预算', level: 'danger' },
        { text: '竞品X发布新版本需关注', level: 'warn' },
      ],
      morning: 'MQL达成率68%需加速！CAC升至520元超预算。',
      agents: [{ name: '线索猎手', desc: '线索获取优化', status: '在线' }],
      channels: ['市场-线索池', '市场-投放优化', '市场-竞品动态'],
      ribbon: 'MQL 68% ⚠ · CAC 520元 🔴',
      nextStep: '培育',
    },
  },
  '制造业': {
    '生产部': {
      kpis: [
        { name: 'OEE', value: '78%', target: '≥85%', status: 'bad', trend: 'down' },
        { name: '产量达标率', value: '96%', target: '≥98%', status: 'warn', trend: 'flat' },
        { name: '一次合格率', value: '99.2%', target: '≥99%', status: 'good', trend: 'up' },
      ],
      workflow: ['月排产', '日派工', '生产执行', '过程检验', '入库'],
      wfCurrent: 2,
      top3: [
        { text: '3号线OEE降至78%设备异常', level: 'danger' },
        { text: 'B工单延迟2h', level: 'warn' },
        { text: '一次合格率99.2%达标杆', level: 'info' },
      ],
      morning: '3号线OEE降至78%设备异常！B工单延迟2h。合格率99.2%达标杆。',
      agents: [
        { name: '排产调度员', desc: '智能排产优化', status: '在线' },
        { name: 'OEE分析师', desc: '设备效率诊断', status: '告警中' },
      ],
      channels: ['生产-排产看板', '生产-异常报警', '生产-OEE数据', '生产-交接班'],
      ribbon: 'OEE 78% 🔴 · 合格率99.2% ✓',
      nextStep: '生产执行',
    },
    '设备部': {
      kpis: [
        { name: '设备可用率', value: '94.5%', target: '≥95%', status: 'warn', trend: 'down' },
        { name: 'MTBF', value: '680h', target: '≥720h', status: 'warn', trend: 'down' },
        { name: 'MTTR', value: '3.2h', target: '≤4h', status: 'good', trend: 'up' },
      ],
      workflow: ['巡检', '预防性维护', '故障抢修', '恢复验收'],
      wfCurrent: 1,
      top3: [
        { text: '3号线主电机温度异常需紧急巡检', level: 'danger' },
        { text: '5台设备保养本周到期', level: 'warn' },
        { text: 'MTTR上月3.2h优于目标', level: 'info' },
      ],
      morning: '3号线主电机温度异常需紧急巡检！5台设备保养到期。',
      agents: [{ name: '设备管家', desc: '预防性维护', status: '告警中' }],
      channels: ['设备-点检记录', '设备-故障处理', '设备-保养计划'],
      ribbon: '可用率94.5% ⚠ · MTTR 3.2h ✓',
      nextStep: '预防性维护',
    },
    '供应商质量部': {
      kpis: [
        { name: '来料合格率', value: '99.6%', target: '≥99.5%', status: 'good', trend: 'flat' },
        { name: 'PPM', value: '62', target: '≤50', status: 'warn', trend: 'up' },
        { name: '8D闭环率', value: '85%', target: '100%', status: 'bad', trend: 'down' },
      ],
      workflow: ['来料检验', '异常处置', '8D报告', '供应商评审', '质量改进'],
      wfCurrent: 2,
      top3: [
        { text: '供应商A来料PPM升至120触发8D', level: 'danger' },
        { text: '3份8D超期未闭环需催办', level: 'danger' },
        { text: '来料合格率99.6%稳定', level: 'info' },
      ],
      morning: '供应商A的PPM升至120触发8D！3份8D超期需催办。',
      agents: [
        { name: '质量工程师', desc: '8D报告与评审', status: '在线' },
        { name: '检验调度员', desc: '来料检验安排', status: '在线' },
      ],
      channels: ['供应商-来料数据', '供应商-8D跟踪', '供应商-评审记录'],
      ribbon: 'PPM 62 ⚠ · 8D闭环率85% 🔴',
      nextStep: '8D报告',
    },
    '工艺部': {
      kpis: [
        { name: 'CPK', value: '1.15', target: '≥1.33', status: 'warn', trend: 'down' },
        { name: '变更周期', value: '8.5天', target: '≤7天', status: 'warn', trend: 'up' },
        { name: 'SOP及时率', value: '97%', target: '≥95%', status: 'good', trend: 'flat' },
      ],
      workflow: ['变更申请', '验证', '发布', '培训'],
      wfCurrent: 1,
      top3: [
        { text: '关键工序CPK降至1.15需SPC分析', level: 'danger' },
        { text: '2项工艺变更超期第9天', level: 'warn' },
        { text: '新工艺V3.0验证完成', level: 'info' },
      ],
      morning: '关键工序CPK降至1.15需SPC分析！2项变更超期。',
      agents: [{ name: '工艺优化师', desc: 'CPK与SPC分析', status: '在线' }],
      channels: ['工艺-变更管理', '工艺-SPC数据', '工艺-SOP发布'],
      ribbon: 'CPK 1.15 ⚠ · 变更周期8.5天 ⚠',
      nextStep: '验证',
    },
    '仓储部': {
      kpis: [
        { name: '周转天数', value: '28天', target: '≤30天', status: 'good', trend: 'down' },
        { name: '账物一致率', value: '99.7%', target: '≥99.9%', status: 'warn', trend: 'down' },
        { name: 'FIFO执行率', value: '99.1%', target: '≥98%', status: 'good', trend: 'flat' },
      ],
      workflow: ['入库', '上架', '拣配', '出库'],
      wfCurrent: 2,
      top3: [
        { text: '账物差异0.3%需核查3个库位', level: 'warn' },
        { text: '15项呆滞料超90天需处置', level: 'danger' },
        { text: 'FIFO执行率99.1%良好', level: 'info' },
      ],
      morning: '账物差异0.3%需核查。15项呆滞料超90天需处置决策。',
      agents: [{ name: '仓储管家', desc: '库存优化与FIFO', status: '在线' }],
      channels: ['仓储-入库出库', '仓储-盘点差异', '仓储-呆滞物料'],
      ribbon: '周转28天 ✓ · 一致率99.7% ⚠',
      nextStep: '拣配',
    },
    '安全部': {
      kpis: [
        { name: '事故率', value: '0', target: '0', status: 'good', trend: 'flat' },
        { name: '隐患闭环率', value: '92%', target: '100%', status: 'warn', trend: 'down' },
        { name: '巡检完成率', value: '100%', target: '≥99%', status: 'good', trend: 'flat' },
      ],
      workflow: ['隐患上报', '整改', '验收', '归档'],
      wfCurrent: 1,
      top3: [
        { text: '2项隐患超25天未闭环风险升级', level: 'danger' },
        { text: '周六消防演练需确认参与人员', level: 'warn' },
        { text: '本月安全零事故巡检100%', level: 'info' },
      ],
      morning: '2项隐患超25天未闭环！周六消防演练需确认。本月零事故。',
      agents: [{ name: '安全督察', desc: '隐患追踪与巡检', status: '告警中' }],
      channels: ['安全-隐患跟踪', '安全-巡检记录', '安全-应急演练'],
      ribbon: '事故0 ✓ · 隐患闭环92% ⚠',
      nextStep: '整改',
    },
  },
  '教育行业': {
    '教学部': {
      kpis: [
        { name: '课时完成率', value: '94%', target: '≥98%', status: 'warn', trend: 'down' },
        { name: '满意度', value: '4.3', target: '≥4.2', status: 'good', trend: 'up' },
        { name: '出勤率', value: '97%', target: '≥96%', status: 'good', trend: 'flat' },
      ],
      workflow: ['排课', '备课', '授课', '评估', '改进'],
      wfCurrent: 2,
      top3: [
        { text: '3门课程课时缺口8%需调课', level: 'danger' },
        { text: '满意度调查回收率65%需催促', level: 'warn' },
        { text: '新版评估系统上线可推广', level: 'info' },
      ],
      morning: '3门课程课时缺口8%需调课。满意度调查回收率65%需催促。',
      agents: [
        { name: '教学管家', desc: '排课与考务', status: '在线' },
        { name: '评估专家', desc: '教学效果分析', status: '在线' },
      ],
      channels: ['教学-排课管理', '教学-教学评估', '教学-课程资源'],
      ribbon: '课时94% ⚠ · 满意度4.3 ✓',
      nextStep: '授课',
    },
    '教研部': {
      kpis: [
        { name: '课题结题率', value: '88%', target: '≥90%', status: 'warn', trend: 'flat' },
        { name: '论文发表', value: '3/5篇', target: '≥5/季', status: 'warn', trend: 'down' },
      ],
      workflow: ['课题申报', '研究', '中期检查', '结题'],
      wfCurrent: 2,
      top3: [
        { text: '2项课题中期检查即将到期', level: 'danger' },
        { text: '本季论文3篇差目标2篇', level: 'warn' },
        { text: '新获批省级课题需组队', level: 'info' },
      ],
      morning: '2项课题中期检查即将到期！论文差2篇。',
      agents: [{ name: '课题助手', desc: '课题进度追踪', status: '在线' }],
      channels: ['教研-课题管理', '教研-论文评审', '教研-学术交流'],
      ribbon: '结题率88% ⚠ · 论文3/5 ⚠',
      nextStep: '中期检查',
    },
    '学工部': {
      kpis: [
        { name: '出勤率', value: '97.2%', target: '≥96%', status: 'good', trend: 'flat' },
        { name: '就业率', value: '87%', target: '≥90%', status: 'warn', trend: 'flat' },
        { name: '心理预警', value: '18h', target: '≤24h', status: 'good', trend: 'up' },
      ],
      workflow: ['日常管理', '事件处置', '跟踪', '归档'],
      wfCurrent: 1,
      top3: [
        { text: '3名学生心理测评异常需24h介入', level: 'danger' },
        { text: '就业率87%需加强推荐', level: 'warn' },
        { text: '出勤率97.2%良好', level: 'info' },
      ],
      morning: '3名学生心理测评异常需24h内介入！就业率87%需加强。',
      agents: [{ name: '学工助手', desc: '心理预警与就业', status: '告警中' }],
      channels: ['学工-出勤管理', '学工-心理预警', '学工-就业服务'],
      ribbon: '出勤97.2% ✓ · 就业87% ⚠',
      nextStep: '事件处置',
    },
    '招生部': {
      kpis: [
        { name: '咨询转化率', value: '22%', target: '≥25%', status: 'warn', trend: 'down' },
        { name: '报到率', value: '88%', target: '≥85%', status: 'good', trend: 'flat' },
      ],
      workflow: ['咨询', '体验', '报名', '缴费', '入学'],
      wfCurrent: 1,
      top3: [
        { text: '咨询转化率连降2周需调策略', level: 'danger' },
        { text: '开放日报名超预期+30%', level: 'info' },
        { text: '新媒体ROI达4.2效果显著', level: 'info' },
      ],
      morning: '咨询转化率连降2周需调策略！开放日报名超预期+30%！',
      agents: [{ name: '招生顾问', desc: '渠道与转化优化', status: '在线' }],
      channels: ['招生-咨询管理', '招生-活动策划', '招生-渠道分析'],
      ribbon: '转化率22% ⚠ · 报到率88% ✓',
      nextStep: '咨询',
    },
    '后勤部': {
      kpis: [
        { name: '报修响应', value: '1.8h', target: '≤2h', status: 'good', trend: 'up' },
        { name: '满意度', value: '3.9', target: '≥4.0', status: 'warn', trend: 'down' },
        { name: '巡检完成率', value: '96%', target: '≥98%', status: 'warn', trend: 'down' },
      ],
      workflow: ['报修', '派工', '维修', '验收', '评价'],
      wfCurrent: 2,
      top3: [
        { text: '食堂安全巡检今日必须完成', level: 'danger' },
        { text: '满意度3.9略低于目标', level: 'warn' },
        { text: '报修响应1.8h达标', level: 'info' },
      ],
      morning: '食堂安全巡检今日必须完成！满意度3.9略低。',
      agents: [{ name: '后勤管家', desc: '报修与巡检调度', status: '在线' }],
      channels: ['后勤-报修处理', '后勤-巡检记录', '后勤-满意度'],
      ribbon: '报修1.8h ✓ · 满意度3.9 ⚠',
      nextStep: '维修',
    },
  },
  '金融行业': {
    '前台业务部': {
      kpis: [
        { name: 'AUM增长', value: '-2.1%', target: '≥10%', status: 'bad', trend: 'down' },
        { name: '获客成本', value: '750元', target: '≤800元', status: 'good', trend: 'up' },
        { name: '客户满意度', value: '4.3', target: '≥4.5', status: 'warn', trend: 'flat' },
      ],
      workflow: ['获客', 'KYC', '产品匹配', '交易', '存续管理'],
      wfCurrent: 2,
      top3: [
        { text: 'AUM环比下降2.1%需分析流失', level: 'danger' },
        { text: '3笔高净值大额赎回待处理', level: 'danger' },
        { text: '新品"稳健增长3号"首周超预期', level: 'info' },
      ],
      morning: 'AUM环比下降2.1%需分析！3笔大额赎回待处理。',
      agents: [
        { name: '客户分析师', desc: 'AUM与流失预警', status: '告警中' },
        { name: '产品顾问', desc: '产品匹配推荐', status: '在线' },
      ],
      channels: ['前台-客户管理', '前台-产品销售', '前台-市场动态'],
      ribbon: 'AUM -2.1% 🔴 · 获客750元 ✓',
      nextStep: '产品匹配',
    },
    '中台支撑部': {
      kpis: [
        { name: '审批时效', value: '22h', target: '≤24h', status: 'good', trend: 'up' },
        { name: '流程自动化', value: '62%', target: '≥60%', status: 'good', trend: 'up' },
        { name: '数据质量', value: '98.5%', target: '≥99%', status: 'warn', trend: 'down' },
      ],
      workflow: ['需求接入', '分析', '方案', '开发', '上线'],
      wfCurrent: 2,
      top3: [
        { text: '3笔审批超24h时效需处理', level: 'danger' },
        { text: '流程自动化62%达标', level: 'info' },
        { text: '数据质量2处异常需核查', level: 'warn' },
      ],
      morning: '3笔审批超时效需优先！数据质量2处异常需核查。',
      agents: [{ name: '流程优化师', desc: '审批与自动化', status: '在线' }],
      channels: ['中台-审批流转', '中台-流程优化', '中台-数据质量'],
      ribbon: '审批22h ✓ · 数据质量98.5% ⚠',
      nextStep: '方案',
    },
    '风控部': {
      kpis: [
        { name: 'VaR使用率', value: '82%', target: '≤80%', status: 'bad', trend: 'up' },
        { name: '预警响应', value: '1.2h', target: '≤1h', status: 'warn', trend: 'down' },
        { name: '压力测试', value: '100%', target: '100%', status: 'good', trend: 'flat' },
      ],
      workflow: ['风险识别', '评估', '监控', '预警', '处置'],
      wfCurrent: 3,
      top3: [
        { text: 'VaR使用率82%超限需紧急评估', level: 'danger' },
        { text: '2笔预警超1h未响应已升级', level: 'danger' },
        { text: '季度压力测试全部通过', level: 'info' },
      ],
      morning: 'VaR使用率82%超限需紧急评估！2笔预警超时需处置。',
      agents: [
        { name: '风险分析师', desc: 'VaR与压力测试', status: '告警中' },
        { name: '合规检查员', desc: '监管报送与审查', status: '在线' },
      ],
      channels: ['风控-限额监控', '风控-预警处置', '风控-压力测试'],
      ribbon: 'VaR 82% 🔴 · 预警1.2h ⚠',
      nextStep: '预警',
    },
    '合规部': {
      kpis: [
        { name: '报送及时率', value: '100%', target: '100%', status: 'good', trend: 'flat' },
        { name: '内控闭环率', value: '95%', target: '100%', status: 'warn', trend: 'down' },
        { name: '反洗钱处理', value: '99.5%', target: '≥99%', status: 'good', trend: 'flat' },
      ],
      workflow: ['法规梳理', '合规审查', '报送', '检查', '整改'],
      wfCurrent: 2,
      top3: [
        { text: '银保监报送明天截止数据还在校验', level: 'danger' },
        { text: '2项内控缺陷整改超期30天', level: 'warn' },
        { text: '反洗钱系统升级完成', level: 'info' },
      ],
      morning: '银保监报送明天截止！数据还在校验。2项内控超期30天。',
      agents: [{ name: '合规卫士', desc: '报送与内控追踪', status: '在线' }],
      channels: ['合规-监管报送', '合规-内控整改', '合规-反洗钱'],
      ribbon: '报送100% ✓ · 内控95% ⚠',
      nextStep: '合规审查',
    },
    '产品创新部': {
      kpis: [
        { name: '上线周期', value: '37天', target: '≤30天', status: 'warn', trend: 'up' },
        { name: '创新评分', value: '8.2/10', target: '≥8/10', status: 'good', trend: 'up' },
      ],
      workflow: ['创意', '可行性', '开发', '测试', '上线', '运营'],
      wfCurrent: 2,
      top3: [
        { text: '"智能定投"延迟7天需加速', level: 'warn' },
        { text: '竞品推出同类产品窗口期缩短', level: 'danger' },
        { text: '创新评分8.2超目标', level: 'info' },
      ],
      morning: '"智能定投"延迟7天需加速！竞品推同类产品窗口期缩短。',
      agents: [{ name: '创新导航员', desc: '产品与市场分析', status: '在线' }],
      channels: ['创新-项目跟踪', '创新-竞品监控', '创新-评估反馈'],
      ribbon: '上线37天 ⚠ · 创新8.2 ✓',
      nextStep: '开发',
    },
  },
  '电商': {
    '商品部': {
      kpis: [
        { name: 'SKU动销率', value: '68%', target: '≥70%', status: 'warn', trend: 'down' },
        { name: '上新及时率', value: '92%', target: '≥95%', status: 'warn', trend: 'flat' },
        { name: '商品评分', value: '4.6/5', target: '≥4.5', status: 'good', trend: 'up' },
        { name: '库存周转天数', value: '32天', target: '≤30天', status: 'warn', trend: 'up' },
      ],
      workflow: ['选品调研', '供应商对接', '上架审核', '价格策略', '库存监控', '滞销处理'],
      wfCurrent: 3,
      top3: [
        { text: '618大促备货缺口15%，3个爆款库存不足', level: 'danger' },
        { text: 'SKU动销率连续2周下降至68%', level: 'warn' },
        { text: '新品上架审核积压12个SKU', level: 'warn' },
      ],
      morning: '618备货缺口15%需紧急协调！SKU动销率68%连续下降，新品审核积压12个。',
      agents: [
        { name: '选品顾问', desc: '市场趋势与选品', status: '在线' },
        { name: '库存预警员', desc: '智能库存监控', status: '告警中' },
      ],
      channels: ['商品-选品看板', '商品-库存预警', '商品-供应商协同', '商品-定价策略'],
      ribbon: '动销率68% ⚠ · 评分4.6 ✓',
      nextStep: '上架审核',
    },
    '运营部': {
      kpis: [
        { name: 'GMV', value: '820万', target: '≥1000万', status: 'warn', trend: 'up' },
        { name: '转化率', value: '2.8%', target: '≥3%', status: 'warn', trend: 'down' },
        { name: '客单价', value: '186元', target: '≥200元', status: 'warn', trend: 'flat' },
        { name: 'ROI', value: '3.2', target: '≥3.5', status: 'warn', trend: 'down' },
      ],
      workflow: ['活动策划', '资源协调', '活动上线', '实时监控', '数据复盘'],
      wfCurrent: 2,
      top3: [
        { text: '618活动方案待终审，关键资源位未确认', level: 'danger' },
        { text: '直播间转化率降至1.9%低于大盘', level: 'danger' },
        { text: '会员复购率28%环比+3%', level: 'info' },
      ],
      morning: '618活动方案待终审！直播间转化率仅1.9%需优化。会员复购率28%持续提升。',
      agents: [
        { name: '活动策划师', desc: '营销活动设计', status: '在线' },
        { name: '流量优化师', desc: '投放与转化优化', status: '在线' },
        { name: '直播间教练', desc: '直播运营指导', status: '告警中' },
      ],
      channels: ['运营-活动跟踪', '运营-流量日报', '运营-直播数据', '运营-会员运营'],
      ribbon: 'GMV 820万/1000万 ⚠ · 转化率2.8% ⚠',
      nextStep: '资源协调',
    },
    '客服部': {
      kpis: [
        { name: '响应时间', value: '45s', target: '≤30s', status: 'bad', trend: 'up' },
        { name: '满意度', value: '94%', target: '≥95%', status: 'warn', trend: 'flat' },
        { name: '退款率', value: '3.2%', target: '≤2.5%', status: 'bad', trend: 'up' },
        { name: '首次解决率', value: '82%', target: '≥85%', status: 'warn', trend: 'down' },
      ],
      workflow: ['工单接收', '分类路由', '处理', '回访', '知识库更新'],
      wfCurrent: 1,
      top3: [
        { text: '618预售咨询量激增300%，响应超时', level: 'danger' },
        { text: '退款率升至3.2%超警戒线', level: 'danger' },
        { text: '知识库新增8条FAQ覆盖常见问题', level: 'info' },
      ],
      morning: '618预售咨询激增300%响应超时！退款率3.2%需紧急排查原因。',
      agents: [
        { name: '智能客服教练', desc: '话术优化与质检', status: '在线' },
        { name: '退款分析员', desc: '退款原因分析', status: '告警中' },
      ],
      channels: ['客服-工单看板', '客服-质检报告', '客服-退款分析', '客服-知识库'],
      ribbon: '响应45s 🔴 · 满意度94% ⚠',
      nextStep: '分类路由',
    },
    '物流部': {
      kpis: [
        { name: '发货及时率', value: '96%', target: '≥98%', status: 'warn', trend: 'down' },
        { name: '物流成本/单', value: '8.5元', target: '≤8元', status: 'warn', trend: 'up' },
        { name: '破损率', value: '0.3%', target: '≤0.2%', status: 'bad', trend: 'up' },
      ],
      workflow: ['打单', '拣货', '打包', '出库', '在途追踪', '签收确认'],
      wfCurrent: 3,
      top3: [
        { text: '仓库B拣货效率下降20%人手不足', level: 'danger' },
        { text: '破损率0.3%超目标需排查包装', level: 'danger' },
        { text: '新增合作快递商谈判进行中', level: 'info' },
      ],
      morning: '仓库B拣货效率下降20%！破损率0.3%需排查包装方案。',
      agents: [
        { name: '物流调度员', desc: '仓配优化', status: '在线' },
      ],
      channels: ['物流-发货看板', '物流-异常跟踪', '物流-成本分析'],
      ribbon: '发货96% ⚠ · 破损率0.3% 🔴',
      nextStep: '拣货',
    },
  },
  '互联网': {
    '产品部': {
      kpis: [
        { name: 'DAU', value: '125万', target: '≥150万', status: 'warn', trend: 'up' },
        { name: '次日留存', value: '42%', target: '≥45%', status: 'warn', trend: 'flat' },
        { name: '功能采用率', value: '31%', target: '≥40%', status: 'bad', trend: 'down' },
        { name: 'NPS', value: '38', target: '≥45', status: 'bad', trend: 'down' },
      ],
      workflow: ['需求分析', 'PRD', '设计', '开发', '灰度', '全量', '复盘'],
      wfCurrent: 3,
      top3: [
        { text: 'V3.0重构方案技术评审发现3处架构风险', level: 'danger' },
        { text: '核心功能采用率仅31%远低于目标', level: 'danger' },
        { text: '用户调研报告显示社交功能需求强烈', level: 'info' },
      ],
      morning: 'V3.0重构3处架构风险需决策！核心功能采用率31%远低于目标，需重新评估PMF。',
      agents: [
        { name: '产品策略师', desc: '产品方向与PMF', status: '在线' },
        { name: '数据产品经理', desc: '指标体系与分析', status: '分析中' },
        { name: '竞品雷达', desc: '行业竞品追踪', status: '在线' },
      ],
      channels: ['产品-需求池', '产品-PRD评审', '产品-数据看板', '产品-用户反馈'],
      ribbon: 'DAU 125万 ⚠ · 功能采用率31% 🔴',
      nextStep: '设计',
    },
    '技术部': {
      kpis: [
        { name: '部署频率', value: '8次/天', target: '≥5/天', status: 'good', trend: 'up' },
        { name: 'P99延迟', value: '320ms', target: '≤200ms', status: 'bad', trend: 'up' },
        { name: '错误率', value: '0.15%', target: '≤0.1%', status: 'bad', trend: 'up' },
        { name: 'Sprint交付率', value: '88%', target: '≥90%', status: 'warn', trend: 'flat' },
      ],
      workflow: ['需求拆分', '开发', 'CR', 'QA', '灰度', '全量', '监控'],
      wfCurrent: 4,
      top3: [
        { text: 'P99延迟320ms超目标60%需紧急优化', level: 'danger' },
        { text: '服务A错误率0.15%触发SRE告警', level: 'danger' },
        { text: '微服务拆分方案通过架构评审', level: 'info' },
      ],
      morning: 'P99延迟320ms紧急优化！服务A错误率0.15%触发告警。微服务拆分方案已通过评审。',
      agents: [
        { name: 'SRE工程师', desc: '稳定性与性能', status: '告警中' },
        { name: '架构师', desc: '技术决策与评审', status: '在线' },
        { name: '代码审查员', desc: '质量守护', status: '在线' },
      ],
      channels: ['技术-发布看板', '技术-告警台', '技术-技术债务', '技术-架构决策'],
      ribbon: 'P99 320ms 🔴 · 部署8次/天 ✓',
      nextStep: 'QA',
    },
    '增长部': {
      kpis: [
        { name: '新增用户', value: '12.3万/周', target: '≥15万/周', status: 'warn', trend: 'up' },
        { name: '获客成本', value: '28元', target: '≤25元', status: 'bad', trend: 'up' },
        { name: '病毒系数K', value: '0.6', target: '≥0.8', status: 'warn', trend: 'up' },
        { name: 'LTV/CAC', value: '3.1', target: '≥3', status: 'good', trend: 'flat' },
      ],
      workflow: ['渠道分析', '实验设计', 'A/B测试', '效果评估', '规模化'],
      wfCurrent: 2,
      top3: [
        { text: '获客成本升至28元超预算12%', level: 'danger' },
        { text: '邀请裂变实验K值达0.72接近目标', level: 'info' },
        { text: 'SEO流量连续3周下滑需排查', level: 'warn' },
      ],
      morning: '获客成本升至28元超预算！邀请裂变K值0.72接近目标可加速。SEO流量下滑需排查。',
      agents: [
        { name: '增长黑客', desc: '实验设计与分析', status: '在线' },
        { name: '渠道优化师', desc: '投放与SEO', status: '告警中' },
      ],
      channels: ['增长-实验看板', '增长-渠道数据', '增长-漏斗分析', '增长-留存曲线'],
      ribbon: 'CAC 28元 🔴 · LTV/CAC 3.1 ✓',
      nextStep: 'A/B测试',
    },
    '商业化部': {
      kpis: [
        { name: 'ARR', value: '2800万', target: '≥3500万', status: 'warn', trend: 'up' },
        { name: '付费转化率', value: '4.2%', target: '≥5%', status: 'warn', trend: 'flat' },
        { name: 'ARPU', value: '86元/月', target: '≥100元/月', status: 'warn', trend: 'up' },
        { name: '续费率', value: '78%', target: '≥85%', status: 'bad', trend: 'down' },
      ],
      workflow: ['定价策略', '销售漏斗', '商务谈判', '签约', '客户成功', '续费'],
      wfCurrent: 3,
      top3: [
        { text: '续费率降至78%流失分析显示价格敏感', level: 'danger' },
        { text: '企业客户Pipeline 1200万Q3待签约', level: 'info' },
        { text: '付费墙A/B测试V2方案待上线', level: 'warn' },
      ],
      morning: '续费率降至78%需紧急干预！企业Pipeline 1200万Q3待签约。付费墙V2待上线。',
      agents: [
        { name: '商业化策略师', desc: '定价与收入优化', status: '在线' },
        { name: '客户成功经理', desc: '续费与增购', status: '告警中' },
      ],
      channels: ['商业化-收入看板', '商业化-销售漏斗', '商业化-客户健康', '商业化-竞品定价'],
      ribbon: 'ARR 2800万 ⚠ · 续费率78% 🔴',
      nextStep: '商务谈判',
    },
  },
};

export const INDUSTRIES = Object.keys(MATRIX);
export const IND_COLORS: Record<string, string> = {
  'IT业': '#4facfe',
  '制造业': '#f5a623',
  '教育行业': '#4ecdc4',
  '金融行业': '#a78bfa',
  '电商': '#ff6b6b',
  '互联网': '#54a0ff',
};

export function getMatrixCell(industry: string, dept: string): MatrixCell {
  // Check custom cells first (dynamically generated)
  try {
    const customCells: Array<{ industry: string; dept: string; cell: MatrixCell }> =
      JSON.parse(localStorage.getItem('tbh_custom_matrix_cells') || '[]');
    const custom = customCells.find((c) => c.industry === industry && c.dept === dept);
    if (custom) return custom.cell;
  } catch (err) { console.warn("[matrix]", err); }

  return MATRIX[industry]?.[dept] ?? MATRIX['IT业']['产品部'];
}

export function getDepartments(industry: string): string[] {
  // Check custom cells for departments in this industry
  const customDepts: string[] = [];
  try {
    const customCells: Array<{ industry: string; dept: string }> =
      JSON.parse(localStorage.getItem('tbh_custom_matrix_cells') || '[]');
    for (const c of customCells) {
      if (c.industry === industry && !customDepts.includes(c.dept)) {
        customDepts.push(c.dept);
      }
    }
  } catch (err) { console.warn("[matrix]", err); }

  const baseDepts = Object.keys(MATRIX[industry] ?? {});
  // Merge without duplicates
  const allDepts = [...baseDepts];
  for (const d of customDepts) {
    if (!allDepts.includes(d)) allDepts.push(d);
  }
  return allDepts;
}

/** Get all industries (base + custom) */
export function getAllIndustries(): string[] {
  const customIndustries: string[] = [];
  try {
    const stored = JSON.parse(localStorage.getItem('tbh_custom_industries') || '[]');
    if (Array.isArray(stored)) customIndustries.push(...stored);
  } catch (err) { console.warn("[matrix]", err); }

  const base = Object.keys(MATRIX);
  const all = [...base];
  for (const ind of customIndustries) {
    if (!all.includes(ind)) all.push(ind);
  }
  return all;
}

/** Get color for any industry (base or custom) */
export function getIndustryColor(industry: string): string {
  if (IND_COLORS[industry]) return IND_COLORS[industry];
  // Check custom cells for color
  try {
    const customCells: Array<{ industry: string; color: string }> =
      JSON.parse(localStorage.getItem('tbh_custom_matrix_cells') || '[]');
    const found = customCells.find((c) => c.industry === industry);
    if (found?.color) return found.color;
  } catch (err) { console.warn("[matrix]", err); }
  // Deterministic fallback
  const CUSTOM_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff', '#5f27cd', '#01a3a4', '#f368e0', '#10ac84', '#ee5a24'];
  let hash = 0;
  for (let i = 0; i < industry.length; i++) { hash = ((hash << 5) - hash + industry.charCodeAt(i)) | 0; }
  return CUSTOM_COLORS[Math.abs(hash) % CUSTOM_COLORS.length];
}
