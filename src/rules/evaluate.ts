import type { Answers, Citation, Conclusion, GrayArea, Obligation } from './types'
import {
  deriveOnlyExemptMaterial,
  deriveRegulatedInfo,
  deriveRegulatedMaterial,
  deriveUnitType,
  get,
  getMulti,
  has,
} from './questions'
import { collectRegulations, type RegulationMeta } from './regulations'

const TIAOLI = '《中华人民共和国人类遗传资源管理条例》（2024 修订）'
const XIZE = '《人类遗传资源管理条例实施细则》（2023）'
const FAQ = '《人类遗传资源管理常见问题解答》（2023.09）'
const FAQ2025 = '《人类遗传资源管理常见问题解答》（2025.03）'
const NOTE_MOST = '原发文机关为科技部；2023 年机构改革后，人类遗传资源监管职责已划转国家卫生健康委员会（国家卫健委），申报办理以国家卫健委政务服务平台现行口径为准。'

const A = (article: string, note?: string): Citation => ({ source: TIAOLI, article, confidence: 'A', note, regulationId: 'tiaoli' })
const X = (article: string): Citation => ({ source: XIZE, article, confidence: 'A', note: NOTE_MOST, regulationId: 'xize' })
const F = (topic: string): Citation => ({ source: FAQ, article: topic, confidence: 'B', note: NOTE_MOST, regulationId: 'faq' })
const F25 = (topic: string): Citation => ({ source: FAQ2025, article: topic, confidence: 'B', regulationId: 'faq2025' })
const P = (topic: string): Citation => ({ source: '实务操作惯例', article: topic, confidence: 'C', note: '非法规明文规定，系申报实践中的通行做法，建议重大事项与主管部门沟通确认。', regulationId: 'practice' })

export interface EvalResult {
  unitType: 'chinese' | 'foreign' | 'unclear'
  regulatedMaterial: boolean
  regulatedInfo: boolean
  onlyExemptMaterial: boolean
  conclusions: Conclusion[]
  grayAreas: GrayArea[]
  /** 本次评估实际引用到的法规版本快照（按引用顺序去重） */
  regulations: RegulationMeta[]
}

/** 汇总全部结论（含后续义务）中引用到的法规，生成版本快照 */
function regulationsOf(conclusions: Conclusion[]): RegulationMeta[] {
  const ids: string[] = []
  for (const c of conclusions) {
    for (const ci of c.citations) if (ci.regulationId) ids.push(ci.regulationId)
    for (const ob of c.obligations) for (const ci of ob.citations) if (ci.regulationId) ids.push(ci.regulationId)
  }
  return collectRegulations(ids)
}

export function evaluate(a: Answers): EvalResult {
  if (((a._flow as string | undefined) ?? 'new') === 'existing') {
    return evaluateChange(a)
  }
  const unit = deriveUnitType(a)
  const regM = deriveRegulatedMaterial(a)
  const regI = deriveRegulatedInfo(a)
  const onlyExemptM = deriveOnlyExemptMaterial(a)
  const conclusions: Conclusion[] = []
  const grayAreas: GrayArea[] = []

  const push = (c: Conclusion) => conclusions.push(c)

  // ── 灰色地带收集 ──
  if (unit === 'unclear') {
    grayAreas.push({
      question: '单位性质判定',
      answer: '股权 / 实控关系不清楚',
      advice: '单位性质直接决定申报资格与路径（外方单位禁止采集、保藏），且由单位自行判定并承担责任，建议就此咨询专业顾问。',
    })
  }
  const unclearMap: [string, string][] = [
    ['collect_family', '是否涉及重要遗传家系'],
    ['collect_region', '是否涉及特定地区人遗资源'],
    ['collect_scale', '采集人数是否大于 3000 例'],
    ['coop_insite', '检测分析是否全部在境内指定单位进行'],
    ['serum_origin', '血清 / 血浆是否由本项目采集的全血处理获得'],
  ]
  for (const [id, label] of unclearMap) {
    if (get(a, id) === 'unclear') {
      grayAreas.push({ question: label, answer: '不清楚', advice: '该问题直接影响申报义务的结论，建议核实后重新评估，或就此咨询专业顾问。' })
    }
  }

  // ── 资源不在管理范围 ──
  if (!regM && !regI) {
    push({
      id: 'out-of-scope',
      type: 'exempt',
      title: '现有信息下，项目对象原则上不纳入人类遗传资源管理',
      summary: onlyExemptM
        ? '尿液、粪便、血清、血浆等仅含极少量脱落/游离细胞或基因的样本，以及不含细胞的人体分泌物、体液、拭子，不纳入人遗材料管理范围；单纯的临床、影像、蛋白质、代谢数据不属于人遗信息。'
        : '所选对象不属于人遗材料或人遗信息的管理范围。',
      citations: [
        A('第二条'),
        X('第二条'),
        F('第四部分第 1 问：尿液、粪便、血清、血浆等材料不再纳入人遗材料管理范围'),
      ],
      obligations: [],
      reasons: ['资源识别：未发现受监管的人遗材料或人遗信息'],
      risk: '注意：若使用上述样本进行基因、基因组、转录组、表观组及核酸类生物标志物检测，产生的人遗信息在涉及国际合作、信息对外提供或开放使用时，仍纳入相应许可 / 备案 / 事先报告管理。',
    })
    if (regI || get(a, 'resource_kind') !== 'material_only') {
      // 补充说明已在 risk 中
    }
    return { unitType: unit, regulatedMaterial: regM, regulatedInfo: regI, onlyExemptMaterial: onlyExemptM, conclusions, grayAreas, regulations: regulationsOf(conclusions) }
  }

  // ── 血清 / 血浆来源于本项目采集全血：按全血申报 + 第三方实验室认定 ──
  if (get(a, 'serum_origin') === 'from_whole_blood') {
    push({
      id: 'serum-from-whole-blood',
      type: 'notice',
      title: '血清 / 血浆按全血申报：材料纳入管理范围，并注意第三方实验室认定',
      summary:
        '血清、血浆不再纳入人遗材料管理范围；但由本项目采集全血处理获得的血清 / 血浆，应按全血进行申报。本评估已按"涉及受监管材料（全血）"处理。',
      citations: [F25('第四部分第 3 问：血清、血浆由采集全血处理获得的按全血申报')],
      obligations: [],
      reasons: ['血清 / 血浆由本项目采集的全血处理获得'],
      risk: '第三方实验室认定：全血在医疗卫生机构处理为血清 / 血浆后送检、且不进行基因 / 基因组 / 转录组 / 表观组及核酸类生物标志物检测的，检测单位不纳入第三方实验室管理；若将采集的全血送至检测单位处理获得血清 / 血浆的，该检测单位仍按第三方实验室管理（影响国际合作申报与变更审批范围）。',
    })
  }

  // ── 外方单位禁止事项 ──
  if (unit === 'foreign') {
    const forbidden: string[] = []
    if (has(a, 'activities', 'collect')) forbidden.push('采集')
    if (has(a, 'activities', 'bank')) forbidden.push('保藏')
    if (has(a, 'activities', 'export')) forbidden.push('以提供方身份将材料运送出境')
    if (forbidden.length > 0) {
      push({
        id: 'foreign-prohibited',
        type: 'prohibited',
        title: `禁止：外方单位不得在我国境内${forbidden.join('、')}我国人类遗传资源`,
        summary: '外国组织、个人及其设立或实际控制的机构，不得在我国境内采集、保藏我国人类遗传资源，不得向境外提供我国人类遗传资源。相关活动必须由中方单位开展，外方如需利用，应与中方单位合作并履行国际合作审批 / 备案程序。',
        citations: [A('第七条'), X('第十一条'), F('第二部分：对外提供人遗资源的提供方仅指中方单位')],
        obligations: [],
        reasons: ['身份识别：外方单位', `活动识别：${forbidden.join('、')}`],
        risk: '违反该禁止性规定的，处 100 万元以上 1000 万元以下罚款（违法所得 100 万元以上的，处违法所得 5-10 倍罚款），并可能记入信用记录、向社会公示（条例第四十一条）。',
      })
    }
  }

  // ── 采集 ──
  if (has(a, 'activities', 'collect') && unit !== 'foreign') {
    const triggers: string[] = []
    if (get(a, 'collect_family') === 'yes') triggers.push('重要遗传家系')
    if (get(a, 'collect_region') === 'yes') triggers.push('特定地区人遗资源')
    const bigScale = get(a, 'collect_scale') === 'yes' && get(a, 'collect_ctrial') !== 'yes'
    if (bigScale) triggers.push('大规模人群研究（>3000 例）')

    const absorbedByBank = has(a, 'activities', 'bank') && get(a, 'bank_purpose') === 'no'
    const absorbedByCoop = has(a, 'activities', 'coop') && get(a, 'coop_role') === 'substantial'

    if (get(a, 'collect_scale') === 'yes' && get(a, 'collect_ctrial') === 'yes' && triggers.length === 0) {
      push({
        id: 'collect-exempt-ctrial',
        type: 'exempt',
        title: '采集许可豁免：上市许可目的临床试验涉及的大规模采集',
        summary: '为取得相关药品和医疗器械在我国上市许可的临床试验涉及的人遗资源采集活动，无需申请采集行政许可。',
        citations: [X('第二十七条')],
        obligations: [],
        reasons: ['大规模人群研究 >3000 例', '属于上市许可目的的临床试验'],
      })
    } else if (triggers.length > 0) {
      const absorbed = absorbedByBank || absorbedByCoop
      push({
        id: 'collect-approval',
        type: absorbed ? 'notice' : 'approval',
        title: absorbed ? '采集许可已被其他事项吸收，无需单独申报' : '需要申请：人类遗传资源采集行政许可',
        summary: absorbed
          ? `采集活动涉及${triggers.join('、')}，原则上应申请采集许可；但因项目同时${absorbedByBank ? '涉及保藏活动' : '属于国际合作事项'}，按吸收规则只需申报${absorbedByBank ? '保藏行政许可' : '国际合作审批 / 备案'}，无需另行申请采集许可。`
          : `采集活动涉及${triggers.join('、')}，应当依法申请人类遗传资源采集行政许可，获批后方可开展采集。`,
        citations: absorbed
          ? [X(absorbedByBank ? '第二十九条' : '第二十七条'), F(absorbedByBank ? '第一部分第 1 问' : '第一部分第 3 问：同时符合采集许可和国际合作范围的，仅申报国际合作事项')]
          : [A('第十一条'), X('第二十七条')],
        obligations: absorbed
          ? []
          : [
              { title: '申请条件自查', deadline: '申报前：法人资格、目的合法、方案合理、伦理审查通过、管理制度、场所设施人员（条例第十一条）', citations: [A('第十一条')] },
              { title: '重大事项变更申请', deadline: '采集参与单位、目的、方案或内容等重大事项变更时，向主管部门提出变更申请', citations: [X('第四十四条')] },
              { title: '许可延续', deadline: '有效期届满 30 个工作日前提出延续申请', citations: [X('第五十五条')] },
              { title: '参与单位伦理文件', deadline: '多中心采集：各参与医疗卫生机构将本单位伦理审查批件（或认可证明）及承诺书提交主管部门后方可开展采集', citations: [F('第一部分第 6 问')] },
            ],
        reasons: [`触发情形：${triggers.join('、')}`],
        risk: '未经批准采集的，没收人遗资源和违法所得，处 50 万-500 万元罚款（违法所得 100 万元以上的处 5-10 倍），情节严重的 1-5 年直至永久禁止从事人遗活动（条例第三十六、四十三条）。',
      })
    } else {
      push({
        id: 'collect-exempt-general',
        type: 'exempt',
        title: '一般采集活动：无需采集行政许可',
        summary: '未涉及重要遗传家系、特定地区或大规模人群研究（>3000 例）的采集，不属于采集许可适用范围；但仍须履行伦理审查、事先书面知情同意、遵守技术规范等一般义务。',
        citations: [X('第二十七条'), A('第九条、第十二条')],
        obligations: [
          { title: '伦理审查', deadline: '采集前通过已备案伦理（审查）委员会的审查', citations: [X('第八条')] },
          { title: '书面知情同意', deadline: '采集前告知目的、用途、健康影响、隐私保护措施及自愿参与/随时退出权利，取得书面同意', citations: [A('第十二条')] },
        ],
        reasons: ['采集触发情形均为否'],
      })
    }
  }

  // ── 保藏 ──
  if (has(a, 'activities', 'bank') && unit !== 'foreign') {
    if (get(a, 'bank_purpose') === 'yes') {
      push({
        id: 'bank-exempt',
        type: 'exempt',
        title: '临时存储不构成保藏：无需保藏行政许可',
        summary: '以教学为目的，或在实验室检测后按照法律法规要求、临床研究方案约定的临时存储行为，不属于保藏许可适用范围。',
        citations: [X('第二十八条')],
        obligations: [],
        reasons: ['保存性质：教学 / 临时存储'],
      })
    } else {
      push({
        id: 'bank-approval',
        type: 'approval',
        title: '需要申请：人类遗传资源保藏行政许可',
        summary: '在我国境内开展人遗资源保藏、为科学研究提供基础平台的，应当经主管部门批准。保藏活动同时涉及采集的，只需申请保藏许可。',
        citations: [A('第十四条'), X('第二十八、二十九条')],
        obligations: [
          { title: '年度报告', deadline: '每年 1 月 31 日前提交上一年度保藏情况年度报告', citations: [X('第三十条')] },
          { title: '重大事项变更申请', deadline: '保藏目的、方案或内容等重大事项变更时提出变更申请', citations: [X('第四十五条')] },
          { title: '许可延续', deadline: '有效期届满 30 个工作日前提出延续申请', citations: [X('第五十五条')] },
          { title: '来源与使用记录', deadline: '持续完整记录并妥善保存人遗资源来源信息和使用信息', citations: [A('第十五条')] },
        ],
        reasons: ['保存性质：长期保藏 / 建库'],
        risk: '未经批准保藏的处罚与未经批准采集相同（条例第三十六条）；未提交年度报告、未完整记录来源信息的，可处警告及 50 万元以下罚款（条例第四十条）。',
      })
    }
  }

  // ── 境内纯中方利用 ──
  if (has(a, 'activities', 'use')) {
    push({
      id: 'use-exempt',
      type: 'exempt',
      title: '境内纯中方利用：无审批 / 备案要求',
      summary: '中方单位在境内利用我国人遗资源开展研究开发，无专门审批要求，国家予以支持；但须通过伦理审查、取得书面知情同意、遵守技术规范。',
      citations: [A('第十八条'), A('第九条、第十二条'), X('第八条')],
      obligations: [],
      reasons: ['活动识别：境内利用，无外方参与'],
    })
  }

  // ── 国际合作 ──
  if (has(a, 'activities', 'coop')) {
    const role = get(a, 'coop_role')
    if (role === 'funding_only' || role === 'service_only') {
      push({
        id: 'coop-exempt',
        type: 'exempt',
        title: '不纳入国际合作管理：无需申报国际合作审批 / 备案',
        summary:
          role === 'funding_only'
            ? '外方无实质性参与、不获取研究数据信息、不共享研究成果（如仅提供研究用药或部分经费资助）的，不纳入利用我国人遗资源开展的国际合作管理。'
            : '申办方、CRO、组长单位、第三方实验室等合作各方均为中方单位，仅 EDC 供应商或数据统计公司等服务方为外方的，不需要申请国际合作事项；项目实施中产生的人遗信息传输给外方 EDC 供应商或数据统计公司，按协议数据管理约定开展相关工作的，亦无需信息备份和事先报告。',
        citations: role === 'funding_only'
          ? [F('第二部分第 5 问')]
          : [F('第二部分第 2 问'), F25('第三部分第 5 问：信息传输给 EDC 供应商或数据统计公司按协议数据管理约定开展工作的，无需信息备份和事先报告')],
        obligations: [],
        reasons: [role === 'funding_only' ? '外方仅资助、无实质参与' : '仅服务供应商为外方'],
        risk: role === 'service_only' ? '注意：外方服务方若在协议数据管理约定范围以外使用研究数据，应由中方数据信息所有者申请人遗信息对外提供事先报告。' : undefined,
      })
    } else if (role === 'substantial') {
      const purpose = get(a, 'coop_purpose')
      const insite = get(a, 'coop_insite')
      const exploratory = get(a, 'coop_exploratory') === 'yes'
      const multicenter = get(a, 'coop_multicenter') === 'yes'
      const exportInvolved = has(a, 'activities', 'export') && get(a, 'export_only_exempt') !== 'yes'

      const commonObligations: Obligation[] = [
        { title: '合作研究情况报告', deadline: '许可 / 备案有效期届满后 6 个月内，合作双方共同提交', citations: [A('第二十六条'), X('第三十五条')] },
        { title: '延续申请', deadline: '有效期届满 30 个工作日前提出', citations: [X('第五十五条')] },
        { title: '双方共同申请', deadline: '国际合作事项由中方单位和外方单位共同申请，不得拆分多中心研究分别申请', citations: [X('第三十三条')] },
        { title: '中方实质性参与', deadline: '合作期间中方单位及研究人员全过程、实质性参与，所有记录及数据信息完全向中方开放并提供备份', citations: [A('第二十四条')] },
        { title: '剩余样本处理', deadline: '仍有研究价值的剩余样本原则上返还人遗资源样本提供方；或按申报时提交的暂存地点和期限暂存一定期限后，按相关规范予以销毁', citations: [F25('第二部分第 1 问：国际合作剩余样本原则上返还样本提供方，或按申报的暂存地点和期限暂存后按规范销毁')] },
      ]

      if (purpose === 'yes' && insite === 'yes' && !exportInvolved) {
        push({
          id: 'coop-filing',
          type: 'filing',
          title: '需要办理：国际合作临床试验备案',
          summary: '为取得药品、医疗器械在我国上市许可，在临床医疗卫生机构利用我国人遗资源开展国际合作临床试验、不涉及材料出境，且采集/检测/分析/剩余样本处理均在临床机构内或由方案指定境内单位进行的，不需要审批，但应在开展临床试验前向主管部门备案。',
          citations: [A('第二十二条'), X('第三十二条')],
          obligations: [
            { title: '前置条件', deadline: '备案前取得药监部门临床试验批件、通知书或备案登记材料', citations: [X('第五十一条')] },
            { title: '备案材料清单', deadline: '合作各方基本情况；研究涉及使用的人遗资源种类、数量和用途；研究方案；组长单位伦理审查批件；其他证明材料', citations: [X('第五十二条')] },
            { title: '申办方一致性', deadline: '申办方应与临床试验批件、通知书或备案材料的申请方一致；不一致的，需提交相关协议等证明材料明确各自权责', citations: [F('第二部分第 3 问')] },
            { title: '备案时点', deadline: '开展临床试验前完成备案', citations: [A('第二十二条')] },
            { title: '多中心规则', deadline: '组长单位通过伦理审查后即可由申办方或组长单位申请备案；参与单位提交伦理批件（或认可证明）及承诺书后开展研究', citations: [X('第三十四条')] },
            { title: '备案变更', deadline: '人遗种类、数量、用途或合作方、方案、内容、目的等重大事项变更的，及时办理备案变更；不涉及的变更在开始前提交书面说明', citations: [X('第五十三条')] },
            ...commonObligations,
          ],
          reasons: ['外方实质性参与', '上市许可目的临床试验', '检测分析均在境内指定单位', '不涉及材料出境'],
          risk: '未备案即开展国际合作临床试验的，没收人遗资源和违法所得，处 50 万-500 万元罚款（违法所得 100 万元以上的处 5-10 倍）（条例第三十六条）。',
        })
      } else {
        const whyApproval: string[] = []
        if (purpose === 'no') whyApproval.push('非上市许可目的的科学研究（含 IIT）')
        if (purpose === 'yes' && insite !== 'yes') whyApproval.push('检测 / 分析 / 剩余样本处理未全部在临床机构内或方案指定境内单位进行')
        if (exportInvolved) whyApproval.push('涉及人遗材料出境')
        push({
          id: 'coop-approval',
          type: 'approval',
          title: '需要申请：人类遗传资源国际合作科学研究行政许可',
          summary: '利用我国人遗资源开展国际合作科学研究，应由合作双方共同提出申请，经主管部门批准后方可开展。',
          citations: [A('第二十一条、第二十二条'), X('第三十一条')],
          obligations: [
            { title: '双方伦理审查', deadline: '申报前通过合作双方各自所在国（地区）伦理审查；外方确无法提供的，可提交其认可中方伦理审查意见的证明材料；单位性质为外方的合同研究组织（CRO）、第三方实验室无需提供所在国（地区）伦理审查证明材料', citations: [A('第二十二条'), X('第三十一条'), F25('第二部分第 9 问：外方合同研究组织、第三方实验室无需提供所在国（地区）伦理审查证明材料')] },
            { title: '合作协议', deadline: '申办方、组长单位、CRO、第三方实验室需提供相互关联的中文签字盖章协议', citations: [F('第二部分第 10 问')] },
            { title: '重大事项变更审批', deadline: '研究目的、内容、人遗种类数量用途、申办方/组长单位/CRO/第三方实验室等变更的，办理变更审批；累计不超获批数量 10% 等情形仅需书面说明', citations: [A('第二十三条'), X('第四十六、四十七条')] },
            { title: '申报一致性自查', deadline: '伦理审查批件项目名称须与申报项目完全一致；申请样本量须与研究方案一致（不一致需作出合理说明）；研究方案内容不得超出合作协议范围', citations: [F('第一部分第 5 问；第四部分第 5-6 问')] },
            { title: '成果归属', deadline: '专利由合作双方共同申请、共有；其他成果按协议约定', citations: [A('第二十四条')] },
            ...commonObligations,
          ],
          reasons: ['外方实质性参与', ...whyApproval],
          risk: '未经批准开展国际合作科学研究的，没收人遗资源和违法所得，处 50 万-500 万元罚款（违法所得 100 万元以上的处 5-10 倍），情节严重的 1-5 年直至永久禁止从事人遗活动（条例第三十六、四十三条）。',
        })
      }

      if (multicenter) {
        push({
          id: 'coop-multicenter',
          type: 'notice',
          title: '多中心临床研究规则：不得拆分申请，由申办方或组长单位统一办理',
          summary: '涉及多中心临床研究的国际合作事项，不得拆分后分别申请行政许可或备案。组长单位通过伦理审查后即可由申办方或组长单位申请；取得许可或完成备案后，各参与医疗卫生机构将本单位伦理审查批件（或认可组长单位批件的证明材料）及本单位承诺书提交主管部门，即可开展研究。',
          citations: [X('第三十三、三十四条'), F('第一部分第 6 问')],
          obligations: [],
          reasons: ['多中心临床研究'],
        })
      }

      if (exploratory) {
        push({
          id: 'coop-exploratory',
          type: 'approval',
          title: '探索性研究部分：需另行申请国际合作科学研究行政许可',
          summary: '为取得药品、医疗器械上市许可的临床试验中涉及的探索性研究部分，不适用临床试验备案，应当申请国际合作科学研究行政许可。',
          citations: [X('第三十二条'), F('第二部分：备案转许可应先暂停相关研究内容，获批后再开展')],
          obligations: [],
          reasons: ['临床试验包含探索性研究部分'],
        })
      }
    }
  }

  // ── 材料出境 ──
  if (has(a, 'activities', 'export') && unit !== 'foreign') {
    if (get(a, 'export_only_exempt') === 'yes') {
      push({
        id: 'export-exempt',
        type: 'exempt',
        title: '材料出境豁免：仅尿液 / 粪便 / 血清 / 血浆出境无需申报',
        summary: '上述材料不再纳入人遗材料管理范围，其出境无需申报。',
        citations: [F('第四部分第 2 问')],
        obligations: [],
        reasons: ['出境材料仅为豁免类型'],
      })
    } else {
      const merged = has(a, 'activities', 'coop') && get(a, 'coop_role') === 'substantial'
      push({
        id: 'export-approval',
        type: 'approval',
        title: '需要申请：人遗资源材料出境审批（出境证明）',
        summary: merged
          ? '将人遗材料运送、邮寄、携带出境，应取得主管部门出具的出境证明；因属于国际合作项目，可在国际合作申请中列明出境计划一并申请、合并审批。'
          : '将人遗材料运送、邮寄、携带出境，应当取得主管部门出具的人类遗传资源材料出境证明，凭证明办理海关手续。',
        citations: [A('第二十七条'), X('第三十七条：涉及出口管制物项的还须遵守出口管制法律法规')],
        obligations: [
          { title: '出境条件自查', deadline: '申报前：无安全危害、法人资格、明确境外合作方与合理用途、来源合法、通过伦理审查', citations: [A('第二十七条')] },
        ],
        reasons: ['涉及受监管材料出境'],
        risk: '未经批准将人遗材料运送、邮寄、携带出境的，由海关依法处罚（条例第三十八条）；情节严重可能触犯刑法（非法运送人遗材料出境，最高七年有期徒刑）。',
      })
    }
  }

  // ── 信息对外提供 / 开放使用 ──
  if (has(a, 'activities', 'info_out')) {
    if (get(a, 'info_public') === 'yes') {
      push({
        id: 'info-exempt-public',
        type: 'exempt',
        title: '利用已公开数据：无需信息备份和事先报告',
        summary: '利用已公开的人类遗传资源数据，不需要进行信息备份和事先报告。',
        citations: [F('第三部分第 2 问')],
        obligations: [],
        reasons: ['仅使用已公开数据'],
      })
    } else if (get(a, 'info_within_coop') === 'yes') {
      push({
        id: 'info-exempt-coop',
        type: 'exempt',
        title: '合作框架内信息使用：无需单独事先报告',
        summary: '已取得国际合作许可或已完成临床试验备案的项目实施过程中，中方单位向外方单位提供合作产生的人遗信息，如国际合作协议中已约定由合作双方使用的，不需要单独事先报告和提交信息备份。',
        citations: [X('第三十六条')],
        obligations: [],
        reasons: ['协议已约定合作双方使用'],
      })
    } else {
      const secFlags = getMulti(a, 'info_security').filter((x) => x !== 'none')
      if (secFlags.length > 0) {
        const labelMap: Record<string, string> = { family: '重要遗传家系信息', region: '特定地区信息', seq500: '>500 例外显子组 / 基因组测序信息' }
        push({
          id: 'info-security',
          type: 'security-review',
          title: '需要通过：安全审查（对外提供 / 开放使用前）',
          summary: `拟对外提供或开放使用的信息涉及${secFlags.map((x) => labelMap[x]).join('、')}，可能影响我国公众健康、国家安全和社会公共利益，应当通过主管部门组织的安全审查后方可对外提供或开放使用。`,
          citations: [A('第二十八条'), X('第三十七条')],
          obligations: [],
          reasons: [`安全审查触发情形：${secFlags.map((x) => labelMap[x]).join('、')}`],
          risk: '未通过安全审查即对外提供或开放使用的，没收违法所得，处 50 万-500 万元罚款（违法所得 100 万元以上的处 5-10 倍）（条例第三十六条）。',
        })
      }
      push({
        id: 'info-report',
        type: 'report',
        title: '需要办理：人遗信息对外提供 / 开放使用事先报告 + 信息备份',
        summary: '将人遗信息向境外组织、个人及其设立或实际控制的机构提供或开放使用的，中方信息所有者应当向主管部门事先报告并提交信息备份；论文发表、会议发布、平台共享等开放使用情形同样适用。注意边界：项目实施中产生的人遗信息传输给 EDC 供应商或数据统计公司等外方单位，仅按协议数据管理约定开展相关工作的，无需信息备份和事先报告；超出约定范围使用的，仍应事先报告。',
        citations: [A('第二十八条'), X('第三十六条'), F25('第三部分第 5 问：信息传输给 EDC 供应商或数据统计公司按协议数据管理约定开展工作的，无需信息备份和事先报告')],
        obligations: [
          { title: '报告与备份时点', deadline: '数据信息对外提供 / 开放使用之前完成', citations: [F('第三部分第 1 问')] },
          { title: '变更报告', deadline: '用途、接收方等事项变更的，在变更实施前提交事项变更报告', citations: [X('第五十四条')] },
          { title: '开放使用方式选择', deadline: '明确选择“开放使用”或“审核同意后开放使用”方式', citations: [F('第三部分第 4 问')] },
        ],
        reasons: ['向外方提供 / 开放使用人遗信息', '不属于合作框架内约定使用'],
        risk: '未事先报告或提交信息备份的，责令停止、没收违法所得，处 50 万-100 万元罚款（违法所得 100 万元以上的处 5-10 倍）（条例第三十九条）。',
      })
    }
  }

  // ── 通用义务提示 ──
  push({
    id: 'general-compliance',
    type: 'notice',
    title: '通用合规底线（无论是否需要申报均适用）',
    summary: '伦理审查、书面知情同意、禁止买卖人遗资源、不得危害公众健康/国家安全/社会公共利益，是所有涉人遗活动的强制前提；单位性质由单位自行判定并承担相应责任。',
    citations: [A('第八、九、十、十二条'), P('中方 / 外方单位身份由实施主体依据股权与实控规则自行判定并担责')],
    obligations: [],
    reasons: ['适用于全部项目'],
  })

  // 排序：禁止 > 安全审查 > 许可 > 备案 > 报告 > 豁免 > 提示
  const order = ['prohibited', 'security-review', 'approval', 'filing', 'report', 'exempt', 'notice']
  conclusions.sort((x, y) => order.indexOf(x.type) - order.indexOf(y.type))

  return { unitType: unit, regulatedMaterial: regM, regulatedInfo: regI, onlyExemptMaterial: onlyExemptM, conclusions, grayAreas, regulations: regulationsOf(conclusions) }
}

/* ─────────────────────────────────────────────
 * 已获批项目：变更 / 延续 / 报告评估
 * ───────────────────────────────────────────── */

const TRACK_LABEL: Record<string, string> = {
  approval_collect: '采集行政许可',
  approval_bank: '保藏行政许可',
  approval_coop: '国际合作科学研究行政许可',
  filing_trial: '国际合作临床试验备案',
}

function evaluateChange(a: Answers): EvalResult {
  const conclusions: Conclusion[] = []
  const grayAreas: GrayArea[] = []
  const push = (c: Conclusion) => conclusions.push(c)
  const track = get(a, 'ch_track') ?? ''
  const trackLabel = TRACK_LABEL[track] ?? '已获批 / 备案事项'

  // —— 特殊情形：合作方变为外方单位 ——
  if (get(a, 'ch_unit_foreign') === 'yes') {
    push({
      id: 'ch-foreign-shift',
      type: 'approval',
      title: '合作方变为外方单位：先暂停项目，申报国际合作事项后方可继续',
      summary: '正在进行的项目因合作方单位性质变为外方单位的，应当先暂停项目，待国际科学研究合作获批或国际合作临床试验备案取得备案号后，方可继续开展。',
      citations: [F('第二部分第 4 问')],
      obligations: [
        { title: '项目暂停', deadline: '立即暂停涉及人遗资源的研究活动', citations: [F('第二部分第 4 问')] },
        { title: '申报国际合作', deadline: '按国际合作审批 / 备案路径申报（可用“新项目申报评估”流程评估具体路径）', citations: [A('第二十一、二十二条')] },
      ],
      reasons: ['合作方单位性质变为外方单位'],
      risk: '未暂停并补办即继续开展的，按未经批准开展国际合作科学研究处理（条例第三十六条）。',
    })
  }

  // —— 特殊情形：许可 / 备案转换 ——
  if (get(a, 'ch_convert') === 'filing_to_approval') {
    push({
      id: 'ch-convert-f2a',
      type: 'approval',
      title: '备案转许可：暂停备案内容 → 申请国际合作科学研究许可 → 获批后开展',
      summary: '已进行国际合作临床试验备案的项目，因条件改变需转为国际科学研究合作许可的，应当及时暂停备案的国际合作研究内容；申请许可时在其他证明材料中上传总结说明，待获得许可后再开展相应研究内容。',
      citations: [F('第二部分第 6 问'), X('第三十二条')],
      obligations: [],
      reasons: ['备案项目条件改变'],
    })
  } else if (get(a, 'ch_convert') === 'approval_to_filing') {
    push({
      id: 'ch-convert-a2f',
      type: 'filing',
      title: '许可转备案：待项目需要变更时，按变更后的整体内容办理临床试验备案',
      summary: '既往已获批的国际科学研究合作项目，现符合国际合作临床试验备案情形的，无需立即转换；待项目需要进行变更时，重新按照变更后的整体内容办理国际合作临床试验备案。',
      citations: [F('第二部分第 7 问')],
      obligations: [],
      reasons: ['已获批许可项目现符合备案情形'],
    })
  }

  // —— 按事项类型判断变更义务 ——
  if (track === 'approval_collect' || track === 'approval_bank') {
    const id = track === 'approval_collect' ? 'ch_items_collect' : 'ch_items_bank'
    const items = getMulti(a, id).filter((x) => x !== 'none')
    const article = track === 'approval_collect' ? '第四十四条' : '第四十五条'
    if (items.length > 0) {
      const nameOnly = items.every((x) => x === 'name_only')
      push({
        id: `ch-${track}-variation`,
        type: 'approval',
        title: `需要办理：${trackLabel}重大事项变更申请`,
        summary: nameOnly
          ? '采集、保藏许可事项名称变更的，按照重大事项变更流程进行申请。'
          : '取得许可后，采集活动参与单位、采集目的、采集方案或内容 / 保藏目的、保藏方案或内容等重大事项发生变更的，应当向主管部门提出变更申请；其受理、审查、办理期限参照许可申请程序执行。',
        citations: nameOnly ? [F('第一部分第 4 问'), X(article)] : [X(`${article}、第四十八条`)],
        obligations: [],
        reasons: [`变更内容 ${items.length} 项`],
        risk: '变更事项未获批即实施的，可能被认定为未按许可事项开展活动，面临监督检查处理直至行政处罚。',
      })
    }
  } else if (track === 'approval_coop') {
    const items = getMulti(a, 'ch_items_coop').filter((x) => x !== 'none')
    const major = items.filter((x) => ['purpose_content', 'hgr_change', 'key_parties'].includes(x))
    const minor = items.filter((x) => ['qty_within_10', 'other_participants', 'name_only', 'plan_no_hgr'].includes(x))
    if (major.length > 0) {
      push({
        id: 'ch-coop-variation',
        type: 'approval',
        title: '需要办理：国际合作许可重大事项变更审批',
        summary: '研究目的、研究内容发生变更，研究方案涉及的人遗资源种类、数量、用途发生变更，或申办方、组长单位、合同研究组织、第三方实验室等其他重大事项变更的，应当向主管部门提出变更申请，获批后方可实施变更内容。',
        citations: [X('第四十六条'), A('第二十三条')],
        obligations: [],
        reasons: ['涉及重大事项变更'],
        risk: '变更审批决定作出前，可按照原获批事项开展研究；变更的事项须在获得同意变更审批决定后方可开展。',
      })
    }
    if (minor.length > 0) {
      push({
        id: 'ch-coop-notice',
        type: 'notice',
        title: '无需变更审批，但应提交事项变更书面说明及相应材料',
        summary: '下列情形不需要提出变更申请，但应当向主管部门提交书面说明及相应材料：研究内容或方案不变、仅人遗总量累计不超获批数量 10% 的变更；申办方/组长单位/CRO/第三方实验室以外的参与单位变更；合作方法人单位名称变更；方案变更但不涉及人遗种类、数量、用途变化或变更后内容不超出已批准范围。',
        citations: [X('第四十七条')],
        obligations: [
          { title: '书面说明', deadline: '变更事项实施前向主管部门提交事项变更的书面说明及相应材料', citations: [X('第四十七条')] },
        ],
        reasons: ['仅涉及书面说明类变更'],
      })
    }
  } else if (track === 'filing_trial') {
    const items = getMulti(a, 'ch_items_filing').filter((x) => x !== 'none')
    const major = items.filter((x) => ['hgr_change', 'major'].includes(x))
    const minor = items.filter((x) => x === 'plan_no_hgr')
    if (major.length > 0) {
      push({
        id: 'ch-filing-variation',
        type: 'filing',
        title: '需要办理：国际合作临床试验备案变更',
        summary: '完成备案后，涉及的人遗资源种类、数量、用途发生变更，或合作方、研究方案、研究内容、研究目的等重大事项发生变更的，备案人应当及时办理备案变更。',
        citations: [X('第五十三条')],
        obligations: [],
        reasons: ['涉及备案变更情形'],
      })
    }
    if (minor.length > 0) {
      push({
        id: 'ch-filing-notice',
        type: 'notice',
        title: '无需备案变更，但应在变更活动开始前提交书面说明',
        summary: '研究方案或者研究内容变更不涉及人遗资源种类、数量、用途变化的，不需要办理备案变更，但应当在变更活动开始前向主管部门提交事项变更的书面说明及相应材料。',
        citations: [X('第五十三条')],
        obligations: [],
        reasons: ['方案变更不涉及人遗变化'],
      })
    }
  }

  // —— 例行义务提醒 ——
  const routine: Obligation[] = [
    { title: '许可 / 备案延续', deadline: '有效期届满 30 个工作日前提出申请；逾期未决定的视为准予延续', citations: [X('第五十五条')] },
  ]
  if (track === 'approval_coop' || track === 'filing_trial') {
    routine.push({ title: '合作研究情况报告', deadline: '许可 / 备案有效期届满后 6 个月内，合作双方共同提交', citations: [X('第三十五条')] })
  }
  if (track === 'approval_bank') {
    routine.push({ title: '保藏年度报告', deadline: '每年 1 月 31 日前提交上一年度报告', citations: [X('第三十条')] })
  }
  routine.push({ title: '变更期间项目执行', deadline: '变更审批 / 备案变更办理期间，原获批事项可继续开展；变更事项须待批准后方可实施', citations: [F('第四部分第 7 问')] })
  push({
    id: 'ch-routine',
    type: 'notice',
    title: `${trackLabel}：例行义务提醒`,
    summary: '无论是否发生变更，以下例行义务均需按期履行；逾期可能面临责令改正、警告、罚款等处理（条例第四十条）。',
    citations: [X('第五十五条')],
    obligations: routine,
    reasons: ['适用于全部已获批 / 备案项目'],
  })

  const order = ['prohibited', 'security-review', 'approval', 'filing', 'report', 'exempt', 'notice']
  conclusions.sort((x, y) => order.indexOf(x.type) - order.indexOf(y.type))
  return { unitType: 'chinese', regulatedMaterial: true, regulatedInfo: true, onlyExemptMaterial: false, conclusions, grayAreas, regulations: regulationsOf(conclusions) }
}
