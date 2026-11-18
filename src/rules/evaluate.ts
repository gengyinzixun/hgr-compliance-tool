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
const XIZE = '《人类遗传资源管理条例实施细则》（2026，国家卫健委令第 16 号）'
const FAQ = '《人类遗传资源管理常见问题解答》（2023.09）'
const FAQ2025 = '《人类遗传资源管理常见问题解答》（2025.03）'
const FAQ2025S = '《人类遗传资源管理有关问题解答》之一至之五（2025）'
const NOTE_MOST = '2026-11-11 细则换版，监管职责原由科技部划转国家卫健委，现由国家卫生健康委统一主管；申报办理以国家卫健委政务服务平台现行口径为准。'
const NOTE_OLD_FAQ = '本问答依据已废止的 2023 版细则制定；其中与 2026 版细则条文不一致的，以新细则为准，具体申报口径以国家卫健委服务指南为准。'

const A = (article: string, note?: string): Citation => ({ source: TIAOLI, article, confidence: 'A', note, regulationId: 'tiaoli' })
const X = (article: string): Citation => ({ source: XIZE, article, confidence: 'A', note: NOTE_MOST, regulationId: 'xize' })
const F = (topic: string): Citation => ({ source: FAQ, article: topic, confidence: 'B', note: NOTE_OLD_FAQ, regulationId: 'faq' })
const F25 = (topic: string): Citation => ({ source: FAQ2025, article: topic, confidence: 'B', regulationId: 'faq2025' })
const F25s = (topic: string): Citation => ({ source: FAQ2025S, article: topic, confidence: 'B', regulationId: 'faq2025s' })
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
    ['collect_family', '是否涉及清单目录内的重要遗传家系'],
    ['collect_region', '是否涉及清单目录内的特定地区人遗资源'],
    ['collect_scale', '采集人数是否大于 10000 例'],
    ['coop_insite', '检测分析是否全部在境内指定单位进行'],
    ['serum_origin', '血清 / 血浆是否由本项目采集的全血处理获得'],
    ['cells_deidentified', '细胞 / 细胞系是否全部为去标识、无法追溯至个人的商业化永生化细胞系'],
  ]
  for (const [id, label] of unclearMap) {
    if (get(a, id) === 'unclear') {
      grayAreas.push({ question: label, answer: '不清楚', advice: '该问题直接影响申报义务的结论，建议核实后重新评估，或就此咨询专业顾问。' })
    }
  }

  // ── 资源不在管理范围 ──
  if (!regM && !regI) {
    const deidCells = getMulti(a, 'material_type').includes('cells') && get(a, 'cells_deidentified') === 'yes'
    push({
      id: 'out-of-scope',
      type: 'exempt',
      title: '现有信息下，项目对象原则上不纳入人类遗传资源管理',
      summary: deidCells
        ? '已去除样本相关信息、无法追溯至个人的用于生产或科学研究的永生化细胞系，不纳入人类遗传资源监管范围；细胞系来源的小鼠移植模型（CDX）亦不属于人遗材料。'
        : onlyExemptM
          ? '尿液、粪便、血清、血浆等仅含极少量脱落/游离细胞或基因的样本，以及不含细胞的人体分泌物、体液、拭子，不纳入人遗材料管理范围；单纯的临床、影像、蛋白质、代谢数据不属于人遗信息。'
          : '所选对象不属于人遗材料或人遗信息的管理范围。',
      citations: [
        A('第二条'),
        X('第三条'),
        ...(deidCells
          ? [F25s('之一：已去除样本相关信息、无法追溯至个人的永生化细胞系不纳入监管'), F25s('之二：CDX 不属于人遗材料')]
          : [X('第三条：不含细胞的人体分泌物/体液/拭子及尿液、粪便、血清、血浆等样本不纳入材料管理')]),
      ],
      obligations: [],
      reasons: deidCells ? ['资源识别：细胞 / 细胞系全部为去标识、不可追溯的商业化永生化细胞系（含 CDX）'] : ['资源识别：未发现受监管的人遗材料或人遗信息'],
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
        citations: [A('第七条'), X('第九条、第五十九条'), F('第二部分：对外提供人遗资源的提供方仅指中方单位')],
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
    if (bigScale) triggers.push('大规模人群研究（>10000 例）')

    const absorbedByBank = has(a, 'activities', 'bank') && get(a, 'bank_purpose') === 'no'
    const absorbedByCoop = has(a, 'activities', 'coop') && get(a, 'coop_role') === 'substantial'

    if (get(a, 'collect_scale') === 'yes' && get(a, 'collect_ctrial') === 'yes' && triggers.length === 0) {
      push({
        id: 'collect-exempt-ctrial',
        type: 'exempt',
        title: '采集许可豁免：上市许可目的临床试验涉及的大规模采集',
        summary: '为取得相关药品和医疗器械在我国上市许可的临床试验涉及的人遗资源采集活动，无需申请采集行政许可；2026 版细则第 16 条将门槛提高至 >10000 例，上市许可临床试验的采集明确排除在许可范围外。',
        citations: [X('第十六条')],
        obligations: [],
        reasons: ['大规模人群研究 >10000 例', '属于上市许可目的的临床试验'],
      })
    } else if (triggers.length > 0) {
      const absorbed = absorbedByBank || absorbedByCoop
      push({
        id: 'collect-approval',
        type: absorbed ? 'notice' : 'approval',
        title: absorbed ? '采集许可已被其他事项吸收，无需单独申报' : '需要申请：人类遗传资源采集行政许可',
        summary: absorbed
          ? `采集活动涉及${triggers.join('、')}，原则上应申请采集许可；但因项目同时${absorbedByBank ? '涉及保藏活动' : '属于国际合作事项'}，2026 版细则第 20 条将吸收规则扩展至保藏与国际合作科学研究，按吸收规则只需申报${absorbedByBank ? '保藏行政许可' : '国际合作审批 / 备案'}，无需另行申请采集许可。`
          : `采集活动涉及${triggers.join('、')}，应当依法申请人类遗传资源采集行政许可，获批后方可开展采集。注意：任何单位不得以拆分、化整为零等方式规避许可，主管部门可通过学术论文比对等方式发现并纠正违规采集。`,
        citations: absorbed
          ? [X('第二十条')]
          : [A('第十一条'), X('第十六条')],
        obligations: absorbed
          ? []
          : [
              { title: '申请材料清单（8 项）', deadline: '法人资格材料；采集目的合法证明；采集方案合理证明；知情同意书文本；伦理审查证明；人遗管理制度；场所设施设备人员情况及支撑材料；多中心采集的合作协议文本', citations: [X('第十七条')] },
              { title: '多中心采集', deadline: '由组长单位申请采集行政许可，并收集参与单位伦理审查与承诺书等材料', citations: [X('第十八条')] },
              { title: '重大事项变更申请', deadline: '事项名称、申请单位、采集目的、方案、内容、人遗种类数量用途或剩余材料处理变更的，提出变更申请并经批准后方可实施', citations: [X('第十九条')] },
              { title: '许可延续', deadline: '有效期届满 30 个工作日前提出申请；新细则第 51 条明确有效期根据申请人的申请确定，延续扩展适用于备案', citations: [X('第五十一条'), F25s('之五第 2 问：延续行政许可或备案有效期须在届满 30 个工作日前提出申请，逾期将不予受理')] },
            ],
        reasons: [`触发情形：${triggers.join('、')}`],
        risk: '未经批准采集的，没收人遗资源和违法所得，处 50 万-500 万元罚款（违法所得 100 万元以上的处 5-10 倍），情节严重的 1-5 年直至永久禁止从事人遗活动（条例第三十六、四十三条）。',
      })
    } else {
      push({
        id: 'collect-exempt-general',
        type: 'exempt',
        title: '一般采集活动：无需采集行政许可',
        summary: '未涉及清单目录内的重要遗传家系、特定地区或 >10000 例大规模人群研究的采集，不属于采集许可适用范围；但仍须履行伦理审查、事先知情同意、遵守技术规范等一般义务。',
        citations: [X('第十六条'), A('第九条、第十二条'), X('第六条、第七条')],
        obligations: [
          { title: '伦理审查', deadline: '采集前通过伦理审查', citations: [X('第六条、第十七条')] },
          { title: '事先知情同意', deadline: '采集前按照规定获取事先知情同意，尊重和保护提供者隐私权和个人信息权益', citations: [X('第七条')] },
        ],
        reasons: ['采集触发情形均为否'],
      })
    }
  }

  // ── 保藏 ──
  if (has(a, 'activities', 'bank') && unit !== 'foreign') {
    if (get(a, 'bank_purpose') === 'unclear') {
      grayAreas.push({
        question: '样本存储是否构成保藏',
        answer: '不清楚',
        advice: '2026 版细则第 21 条将保藏限定为"仅用于科学研究"，并排除临床诊疗/教学为主兼顾科研、已上市药械生产目的、检测后临时存储三类。该判定直接决定是否需保藏许可，建议留存书面判定依据并向主管部门确认。',
      })
    }
    if (get(a, 'bank_purpose') === 'yes') {
      push({
        id: 'bank-exempt',
        type: 'exempt',
        title: '不构成保藏：无需保藏行政许可',
        summary: '按 2026 版细则第 21 条，以临床诊疗和教学为主要目的、兼顾科研的样本存储，以已上市药品和医疗器械生产为目的的样本存储，以及检测后依法/按方案约定的临时存储，均不属于保藏，无需申请保藏行政许可。建议留存书面判定依据。',
        citations: [X('第二十一条')],
        obligations: [],
        reasons: ['保存性质：临床诊疗/教学为主、药械生产目的或临时存储'],
      })
    } else if (get(a, 'bank_purpose') === 'no') {
      push({
        id: 'bank-approval',
        type: 'approval',
        title: '需要申请：人类遗传资源保藏行政许可',
        summary: '在我国境内开展人遗资源保藏、为科学研究提供基础平台的，应当经国家卫生健康委批准。保藏活动同时涉及采集的，按第 20 条只需申请保藏许可。申请单位须符合保藏技术规范。',
        citations: [A('第十四条'), X('第二十一、二十二条')],
        obligations: [
          { title: '申请材料清单（8 项）', deadline: '法人资格材料；明确保藏目的的保藏方案；知情同意书文本；伦理审查证明；保藏管理制度；保藏技术文件；场所设施设备人员情况及支撑材料；合法来源证明材料', citations: [X('第二十二条')] },
          { title: '年度报告', deadline: '每年 1 月 31 日前提交上一年度报告，内容为保藏情况、使用情况、开放共享情况、产生的成果情况 4 项（旧版报制度执行/设施/人员变动，模板须更换）', citations: [X('第二十四条')] },
          { title: '台账与来源使用记录', deadline: '建立人遗活动台账，完整记录保藏情况、妥善保存来源与使用信息（第 10、24 条）', citations: [X('第十条、第二十四条')] },
          { title: '开放共享', deadline: '加强信息平台建设，制定规范的开放共享机制，及时对外公布已保藏资源情况', citations: [X('第二十四条')] },
          { title: '重大事项变更申请', deadline: '申请单位、保藏场所、保藏目的、保藏方案等变更的，提出变更申请并经国家卫健委批准', citations: [X('第二十三条')] },
          { title: '许可延续', deadline: '有效期届满 30 个工作日前提出申请；新细则第 51 条明确有效期根据申请人的申请确定', citations: [X('第五十一条'), F25s('之五第 2 问：延续行政许可或备案有效期须在届满 30 个工作日前提出申请，逾期将不予受理')] },
        ],
        reasons: ['保存性质：仅用于科学研究的长期保藏 / 建库'],
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
      citations: [A('第十八条'), A('第九条、第十二条'), X('第六条、第七条')],
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
        { title: '合作研究情况报告', deadline: '许可 / 备案有效期届满后 6 个月内，合作双方共同向国家卫生健康委提交', citations: [A('第二十六条'), X('第三十五条')] },
        { title: '延续申请', deadline: '有效期届满 30 个工作日前提出；新细则第 51 条明确有效期根据申请人的申请确定，延续扩展适用于备案', citations: [X('第五十一条'), F25s('之五第 2 问：延续行政许可或备案有效期须在届满 30 个工作日前提出申请，逾期将不予受理')] },
        { title: '双方共同申请', deadline: '国际合作事项由中方单位和外方单位共同申请，不得拆分多中心研究分别申请', citations: [X('第二十九条、第三十二条')] },
        { title: '中方实质性参与', deadline: '合作期间中方单位及研究人员全过程、实质性参与，所有记录及数据信息完全向中方开放并提供备份', citations: [X('第三十一条')] },
        { title: '剩余样本处理', deadline: '剩余材料处理纳入变更管理与合作研究情况报告事项；原则上返还提供方或按申报的暂存地点期限处理后销毁', citations: [X('第三十三条、第三十五条'), F25('第二部分第 1 问：国际合作剩余样本原则上返还样本提供方，或按申报的暂存地点和期限暂存后按规范销毁')] },
      ]

      if (purpose === 'yes' && insite === 'yes' && !exportInvolved) {
        push({
          id: 'coop-filing',
          type: 'filing',
          title: '需要办理：国际合作临床试验备案',
          summary: '为取得药品、医疗器械在我国上市许可，在医疗卫生机构利用我国人遗资源开展国际合作临床试验、不涉及材料出境，且材料在机构内采集、在机构或方案/协议指定的境内单位检测分析和剩余材料处理的，不需要审批，但应在开展临床试验前向国家卫生健康委备案。2026 版细则第 27 条将"临床医疗卫生机构"放宽为"医疗卫生机构"，并明确探索性研究部分无需单独申报。',
          citations: [A('第二十二条'), X('第二十七条')],
          obligations: [
            { title: '备案材料清单（6 项）', deadline: '法人资格材料；目的合法且期限合理的研究方案；知情同意书文本；伦理审查证明；国际合作协议（含知识产权归属与权益分配）；药监部门临床试验批件/通知书/备案登记材料', citations: [X('第二十七条')] },
            { title: '同日确认', deadline: '不涉及人遗信息出境、材料齐全且符合形式审查的，主管部门在收到申请的工作日予以确认（非工作时间/节假日顺延至下一工作日）', citations: [X('第二十八条')] },
            { title: '申办方一致性', deadline: '申办方应与临床试验批件、通知书或备案材料的申请方一致；不一致的，需提交相关协议等证明材料明确各自权责', citations: [F('第二部分第 3 问')] },
            { title: '备案时点', deadline: '开展临床试验前完成备案', citations: [A('第二十二条')] },
            { title: '多中心规则', deadline: '不得拆分申请，由申办方或组长单位统一申请备案；参与单位提交伦理批件（或认可证明）及承诺书后开展研究', citations: [X('第三十二条')] },
            { title: '备案变更', deadline: '事项名称、来源、目的、内容、人遗种类数量用途或剩余材料处理、关键方变更的办理备案变更；10% 或 10 例以内等情形提交书面说明', citations: [X('第三十三条、第三十四条')] },
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
          citations: [A('第二十一条、第二十二条'), X('第二十六条')],
          obligations: [
            { title: '申请材料清单（5 项）', deadline: '法人资格材料；目的合法且期限合理的研究方案；知情同意书文本；伦理审查证明；国际合作协议（含知识产权成果归属与权益分配方案）', citations: [X('第二十六条')] },
            { title: '双方伦理审查', deadline: '应当通过合作方各自所在国（地区）的伦理审查。注意：2026 版细则第 30 条未保留旧版"外方无法提供时可提交认可中方伦理审查意见证明"的例外，涉外项目应先向窗口确认口径', citations: [X('第三十条'), F25('第二部分第 9 问：外方合同研究组织、第三方实验室无需提供所在国（地区）伦理审查证明材料')] },
            { title: '合作协议', deadline: '申办方、组长单位、CRO、第三方实验室需提供相互关联的中文签字盖章协议', citations: [F('第二部分第 10 问')] },
            { title: '重大事项变更审批', deadline: '事项名称、来源、研究目的内容、人遗种类数量用途或剩余材料处理、关键方等变更的，办理变更审批；10% 或 10 例以内等情形仅需书面说明', citations: [X('第三十三条、第三十四条')] },
            { title: '申报一致性自查', deadline: '伦理审查批件项目名称须与申报项目完全一致；申报数量应不多于研究方案及知情同意书写明的数量（不一致需作出合理说明）；研究方案内容不得超出合作协议范围', citations: [F('第一部分第 5 问；第四部分第 5-6 问'), F25s('之五第 1 问：申报的人遗材料及信息数量应不多于方案及知情同意书写明的数量')] },
            { title: '成果归属', deadline: '依据法律规定和协议约定分享相关权益，所有记录及数据信息向中方开放并提供备份', citations: [X('第三十一条')] },
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
          citations: [X('第三十二条')],
          obligations: [],
          reasons: ['多中心临床研究'],
        })
      }

      if (exploratory) {
        push({
          id: 'coop-exploratory',
          type: 'notice',
          title: '探索性研究部分：2026 版起无需单独申报国际合作科学研究审批',
          summary: '按 2026 版细则第 27 条末款，为取得药品、医疗器械上市许可的临床试验中的探索性研究部分，无需单独申报国际合作科学研究审批（旧版细则要求应当申请，现已放宽）。仍须符合伦理审查、知情同意及备案/许可的整体要求。',
          citations: [X('第二十七条')],
          obligations: [],
          reasons: ['临床试验包含探索性研究部分'],
        })
      }
    }
  }

  // ── 材料出境 ──
  if (has(a, 'activities', 'export') && unit !== 'foreign') {
    if (get(a, 'export_clinical_care') === 'yes') {
      push({
        id: 'export-exempt-clinical',
        type: 'exempt',
        title: '材料出境豁免：以临床诊疗为目的的 CAR-T 治疗 / 基因检测相关材料出境无需申报',
        summary: '以临床诊疗为目的的嵌合抗原受体 T 细胞（CAR-T）治疗或基因检测相关材料出境，无需申报人类遗传资源材料出境行政许可。',
        citations: [F25s('之三：以临床诊疗为目的的 CAR-T 治疗或基因检测相关材料出境，无需申报人遗材料出境行政许可')],
        obligations: [],
        reasons: ['出境目的：临床诊疗'],
        risk: '注意：该豁免仅限临床诊疗目的；相关材料若同时用于科学研究（含国际合作研究）或产生的人遗信息对外提供，仍须按相应轨道申报。',
      })
    } else if (get(a, 'export_only_exempt') === 'yes') {
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
        citations: [A('第二十七条'), X('第三十六条、第三十八条：出口物项属管制物项的须遵守出口管制法律法规')],
        obligations: [
          { title: '出境申请材料清单（7 项）', deadline: '法人资格材料；合理出境用途的研究方案；已签署知情同意书；伦理审查证明；国际合作协议；剩余样本处理协议；合法来源证明材料', citations: [X('第三十六条')] },
          { title: '合并审批', deadline: '国际合作科学研究涉及材料出境的，可在申请国际合作时一并列明出境计划，由国家卫健委合并审批', citations: [X('第三十七条')] },
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
        summary: '利用已公开的人类遗传资源信息，不需要事先报告和提交信息备份（2026 版细则第 41 条第 2 款）。',
        citations: [X('第四十一条')],
        obligations: [],
        reasons: ['仅使用已公开数据'],
      })
    } else if (get(a, 'info_within_coop') === 'yes') {
      push({
        id: 'info-exempt-coop',
        type: 'exempt',
        title: '合作框架内信息使用：无需单独事先报告',
        summary: '已取得国际合作许可或已完成临床试验备案项目实施过程中，中方单位向外方单位提供合作产生的人遗信息，如协议已约定由双方使用且在申报信息中已列明接收方外方单位的，不需要单独事先报告和提交信息备份（2026 版细则第 41 条第 1 款，较旧版增加"已列明接收方"条件）。',
        citations: [X('第四十一条')],
        obligations: [],
        reasons: ['协议已约定双方使用且已列明接收方外方单位'],
      })
    } else if (get(a, 'info_publication') === 'yes') {
      push({
        id: 'info-publication',
        type: 'exempt',
        title: '论文 / 学术会议递交数据：视为完成事先报告',
        summary: '以论文发表或学术会议交流为目的的信息对外提供/开放使用，在论文正式发表前或会议前向国家生物信息中心递交数据，即视为完成事先报告（2026 版细则第 40 条）。注意：正式稿为第 40 条，勿引用征求意见稿第 39 条。',
        citations: [X('第四十条')],
        obligations: [
          { title: '递交时点', deadline: '论文正式发表前 / 学术会议前向国家生物信息中心递交数据', citations: [X('第四十条')] },
          { title: '平台衔接', deadline: '其他目的对外提供或开放使用的，须先完成信息备份，再到国家卫健委人类遗传资源管理服务系统完成事先报告', citations: [X('第三十九条'), P('国家生物信息中心事先报告便捷服务口径（2026-09-09 上线）')] },
        ],
        reasons: ['目的为论文发表 / 学术会议交流'],
        risk: '注意：论文/会议简化仅限该特定目的；同一信息若另作他用（如向特定外方单位提供），仍须单独履行事先报告与信息备份。',
      })
    } else if (get(a, 'info_overseas_reg') === 'yes') {
      push({
        id: 'info-exempt-reg',
        type: 'exempt',
        title: '境外上市注册目的：无需单独事先报告',
        summary: '以药品、医疗器械在境外上市注册为目的，将临床试验中产生的人遗信息向境外药品监管机构提供，且已在国际合作临床试验申请中列明并完成备案的，不需要单独事先报告和提交信息备份（2026 版细则第 41 条第 3 款）。',
        citations: [X('第四十一条')],
        obligations: [],
        reasons: ['境外上市注册目的且已在申请中列明并完成备案'],
      })
    } else {
      push({
        id: 'info-report',
        type: 'report',
        title: '需要办理：人遗信息对外提供 / 开放使用事先报告 + 信息备份',
        summary: '将人遗信息向外方单位、境外个人提供或开放使用的，中方信息所有者应当向国家卫生健康委事先报告并提交信息备份，报送事项含目的用途、信息备份情况、接收方基本情况、潜在风险评估情况；论文发表、会议发布、平台共享等开放使用情形同样适用。2026 版细则在细则层面不再单列安全审查程序与 500 例量化门槛，改为分类管理 + 事先报告中的风险自评估；但上位《条例》关于"可能影响公众健康、国家安全和社会公共利益"情形的要求并未废止，不宜理解为安全义务取消。',
        citations: [A('第二十八条'), X('第三十九条')],
        obligations: [
          { title: '报告与备份时点', deadline: '数据信息对外提供 / 开放使用之前完成', citations: [X('第三十九条')] },
          { title: '潜在风险评估', deadline: '事先报告须报送潜在风险评估情况；涉及敏感情形的以国家卫健委服务指南口径为准', citations: [X('第三十九条')] },
          { title: '变更报告', deadline: '用途、接收方等事项变更的，在变更事项实施前重新向国家卫生健康委事先报告', citations: [X('第四十二条')] },
          { title: '开放使用方式选择', deadline: '明确选择"开放使用"或"审核同意后开放使用"方式', citations: [F('第三部分第 4 问')] },
        ],
        reasons: ['向外方提供 / 开放使用人遗信息', '不属于三类免报告情形'],
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
    citations: [A('第八、九、十、十二条'), X('第六条、第七条'), P('中方 / 外方单位身份由实施主体依据股权与实控规则自行判定并担责')],
    obligations: [
      { title: '单位主体责任（2026 版新增）', deadline: '法定代表人负责；明确管理部门、建体系与制度、建立人遗活动台账、对研究目的与方案审查、定期检查与自查', citations: [X('第十条')] },
    ],
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
  report_info: '信息对外提供 / 开放使用事先报告',
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
      citations: [F('第二部分第 4 问'), X('第九条')],
      obligations: [
        { title: '项目暂停', deadline: '立即暂停涉及人遗资源的研究活动', citations: [F('第二部分第 4 问')] },
        { title: '申报国际合作', deadline: '按国际合作审批 / 备案路径申报（可用"新项目申报评估"流程评估具体路径）', citations: [A('第二十一、二十二条'), X('第二十六条、第二十七条')] },
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
      citations: [F('第二部分第 6 问'), X('第二十七条')],
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
    const article = track === 'approval_collect' ? '第十九条' : '第二十三条'
    if (items.length > 0) {
      const nameOnly = items.every((x) => x === 'name_only')
      push({
        id: `ch-${track}-variation`,
        type: 'approval',
        title: `需要办理：${trackLabel}重大事项变更申请`,
        summary: nameOnly
          ? '采集、保藏许可事项名称变更的，按照重大事项变更流程进行申请。'
          : track === 'approval_bank'
            ? '取得保藏许可后，申请单位、保藏场所、保藏目的、保藏方案等事项发生变更的，应当及时提出变更申请，并经国家卫生健康委批准。'
            : '取得采集许可后，事项名称、申请单位、采集目的、方案、内容、人遗种类数量用途或剩余材料处理等变更的，应当及时提出变更申请，经批准后方可实施。',
        citations: [X(article), ...(nameOnly ? [F('第一部分第 4 问')] : [])],
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
        citations: [X('第三十三条'), A('第二十三条')],
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
        summary: '下列情形不需要提出变更申请，但应当向国家卫生健康委及时提交事项变更的书面说明及相应材料：研究内容/方案不变、仅人遗总量累计不超获批数量 10% 或 10 例的变更；合作方法人单位名称变更；申办方/组长单位/CRO/第三方实验室/分中心以外的参与单位变更；方案变更但不涉及人遗种类、数量、用途和剩余材料处理，或变更后内容不超出已批准范围。',
        citations: [X('第三十四条')],
        obligations: [
          { title: '书面说明', deadline: '变更事项实施前向国家卫生健康委提交事项变更的书面说明及相应材料', citations: [X('第三十四条')] },
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
        citations: [X('第三十三条')],
        obligations: [],
        reasons: ['涉及备案变更情形'],
      })
    }
    if (minor.length > 0) {
      push({
        id: 'ch-filing-notice',
        type: 'notice',
        title: '无需备案变更，但应在变更活动开始前提交书面说明',
        summary: '研究方案或者研究内容变更不涉及人遗资源种类、数量、用途和剩余材料处理变化，或变更后内容不超出已批准范围的，不需要办理备案变更，但应当在变更活动开始前向国家卫生健康委提交事项变更的书面说明及相应材料。',
        citations: [X('第三十四条')],
        obligations: [],
        reasons: ['方案变更不涉及人遗变化'],
      })
    }
  } else if (track === 'report_info') {
    const items = getMulti(a, 'ch_items_info').filter((x) => x !== 'none')
    if (items.length > 0) {
      push({
        id: 'ch-info-variation',
        type: 'report',
        title: '需要办理：信息对外提供 / 开放使用事项变更报告',
        summary: '已事先报告的信息对外提供 / 开放使用事项，其用途、接收方等事项发生变更的，应当在变更事项实施前重新向国家卫生健康委事先报告；变更事项须在完成报告后方可实施。',
        citations: [X('第四十二条')],
        obligations: [
          { title: '变更报告时点', deadline: '变更事项实施前重新向国家卫生健康委事先报告', citations: [X('第四十二条')] },
        ],
        reasons: ['已报告事项发生变更'],
        risk: '变更后未提交变更报告即实施的，可能被认定为未按报告事项对外提供信息，面临责令改正、警告及罚款（条例第四十条）。',
      })
    }
  }

  // —— 例行义务提醒 ——
  if (track === 'report_info') {
    // 事先报告为一次性事项：无许可/备案有效期延续、无年度报告义务
    push({
      id: 'ch-routine',
      type: 'notice',
      title: `${trackLabel}：义务提醒`,
      summary: '信息对外提供 / 开放使用事先报告为一次性事项，无有效期延续、年度报告等例行义务；已报告事项发生变更（用途、接收方、信息种类范围等）的，应在变更实施前提交事项变更报告。',
      citations: [X('第三十九条、第四十二条')],
      obligations: [],
      reasons: ['适用于已完成事先报告的事项'],
    })
  } else {
  const routine: Obligation[] = [
    { title: '许可 / 备案延续', deadline: '有效期届满 30 个工作日前提出申请（新细则第 51 条：有效期根据申请人的申请确定，延续扩展适用于备案），逾期提出的不予受理；主管部门逾期未决定的视为准予延续', citations: [X('第五十一条'), F25s('之五第 2 问：延续行政许可或备案有效期须在届满 30 个工作日前提出申请，逾期将不予受理')] },
  ]
  if (track === 'approval_coop' || track === 'filing_trial') {
    routine.push({ title: '合作研究情况报告', deadline: '许可 / 备案有效期届满后 6 个月内，合作双方共同提交', citations: [X('第三十五条')] })
  }
  if (track === 'approval_bank') {
    routine.push({ title: '保藏年度报告', deadline: '每年 1 月 31 日前提交上一年度报告（内容为保藏/使用/开放共享/成果 4 项）', citations: [X('第二十四条')] })
  }
  routine.push({ title: '变更期间项目执行', deadline: '变更审批 / 备案变更办理期间，原获批事项可继续开展；变更事项须待批准后方可实施', citations: [F('第四部分第 7 问')] })
  push({
    id: 'ch-routine',
    type: 'notice',
    title: `${trackLabel}：例行义务提醒`,
    summary: '无论是否发生变更，以下例行义务均需按期履行；逾期可能面临责令改正、警告、罚款等处理（条例第四十条）。',
    citations: [X('第五十一条')],
    obligations: routine,
    reasons: ['适用于全部已获批 / 备案项目'],
  })
  }

  const order = ['prohibited', 'security-review', 'approval', 'filing', 'report', 'exempt', 'notice']
  conclusions.sort((x, y) => order.indexOf(x.type) - order.indexOf(y.type))
  return { unitType: 'chinese', regulatedMaterial: true, regulatedInfo: true, onlyExemptMaterial: false, conclusions, grayAreas, regulations: regulationsOf(conclusions) }
}
