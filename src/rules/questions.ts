import type { Answers, Question } from './types'

export const get = (a: Answers, id: string) => a[id] as string | undefined
export const getMulti = (a: Answers, id: string) => (a[id] as string[] | undefined) ?? []
export const has = (a: Answers, id: string, v: string) => getMulti(a, id).includes(v)

/** 单位性质判定结果（由第 1 层回答推导） */
export function deriveUnitType(a: Answers): 'chinese' | 'foreign' | 'unclear' {
  const t = get(a, 'unit_type')
  if (t === 'chinese') return 'chinese'
  if (t === 'foreign') return 'foreign'
  if (t === 'hk_macao_inland') return 'chinese'
  // 不确定分支：股权 + 实控判定
  const stake = get(a, 'foreign_stake')
  const control = get(a, 'foreign_control')
  const hk = get(a, 'hk_macao')
  if (hk === 'yes') return 'chinese'
  if (stake === 'yes' || control === 'yes') return 'foreign'
  if (stake === 'no' && control === 'no') return 'chinese'
  return 'unclear'
}

/** 是否涉及受监管的人遗材料 */
export function deriveRegulatedMaterial(a: Answers): boolean {
  const kind = get(a, 'resource_kind')
  if (kind === 'info_only') return false
  const m = getMulti(a, 'material_type')
  const regulated = ['whole_blood', 'tissue', 'cells', 'semen', 'csf', 'effusion', 'smear', 'hair']
  return m.some((x) => regulated.includes(x))
}

/** 是否涉及受监管的人遗信息 */
export function deriveRegulatedInfo(a: Answers): boolean {
  const kind = get(a, 'resource_kind')
  if (kind === 'material_only') return false
  const m = getMulti(a, 'info_type')
  const regulated = ['gene', 'transcriptome', 'epigenome', 'biomarker']
  return m.some((x) => regulated.includes(x))
}

/** 是否仅有豁免材料（尿/粪/血清/血浆/无细胞分泌物） */
export function deriveOnlyExemptMaterial(a: Answers): boolean {
  const kind = get(a, 'resource_kind')
  if (kind === 'info_only') return false
  const m = getMulti(a, 'material_type')
  if (m.length === 0) return false
  const exempt = ['urine', 'feces', 'serum', 'plasma', 'acellular']
  return m.every((x) => exempt.includes(x))
}

const L1 = '第 1 层 · 身份识别'
const L2 = '第 2 层 · 资源识别'
const L3 = '第 3 层 · 活动识别'
const L4 = '第 4 层 · 触发与豁免判断'

export const questions: Question[] = [
  // ───────── 第 1 层：身份识别 ─────────
  {
    id: 'unit_type',
    layer: 1,
    layerLabel: L1,
    text: '您的单位属于哪种性质？',
    help: '中方单位：我国科研机构、高等学校、医疗机构或企业（含设在港澳的内资实控机构）。外方单位：境外组织、个人设立或实际控制的机构。单位性质不由营业执照直接认定，需按股权与实际控制关系判定。',
    options: [
      { value: 'chinese', label: '中方单位', hint: '内资独资或中资控股的科研机构、高校、医疗机构、企业' },
      { value: 'foreign', label: '外方单位', hint: '境外组织/个人设立或实际控制的机构（含外商投资企业被境外实控的情形）' },
      { value: 'hk_macao_inland', label: '设在港澳的内资实控机构', hint: '视为中方单位' },
      { value: 'unsure', label: '不确定，需要帮助判定' },
    ],
  },
  {
    id: 'foreign_stake',
    layer: 1,
    layerLabel: L1,
    text: '境外组织或个人是否直接或间接持有单位 50% 以上的股份、股权、表决权、财产份额或其他类似权益？',
    when: (a) => get(a, 'unit_type') === 'unsure',
    options: [
      { value: 'yes', label: '是' },
      { value: 'no', label: '否' },
      { value: 'unclear', label: '不清楚' },
    ],
  },
  {
    id: 'foreign_control',
    layer: 1,
    layerLabel: L1,
    text: '虽然权益不足 50%，境外方是否通过表决权、投资关系、协议或其他安排，足以对单位的决策、管理进行支配或施加重大影响？',
    when: (a) => get(a, 'unit_type') === 'unsure' && get(a, 'foreign_stake') !== 'yes',
    options: [
      { value: 'yes', label: '是' },
      { value: 'no', label: '否' },
      { value: 'unclear', label: '不清楚' },
    ],
  },
  {
    id: 'hk_macao',
    layer: 1,
    layerLabel: L1,
    text: '单位是否设在港澳，且由内资实际控制？',
    when: (a) => get(a, 'unit_type') === 'unsure' && (get(a, 'foreign_stake') === 'yes' || get(a, 'foreign_control') === 'yes'),
    options: [
      { value: 'yes', label: '是（视为中方单位）' },
      { value: 'no', label: '否' },
    ],
  },

  // ───────── 第 2 层：资源识别 ─────────
  {
    id: 'resource_kind',
    layer: 2,
    layerLabel: L2,
    text: '项目涉及的对象属于哪一类？',
    help: '人类遗传资源 = 人遗材料（含遗传物质的器官、组织、细胞等）+ 人遗信息（利用材料产生的基因、基因组等数据）。',
    options: [
      { value: 'material_only', label: '仅涉及样本/材料' },
      { value: 'info_only', label: '仅涉及数据/信息' },
      { value: 'both', label: '两者都涉及' },
    ],
  },
  {
    id: 'material_type',
    layer: 2,
    layerLabel: L2,
    multi: true,
    text: '涉及哪些类型的样本材料？（可多选）',
    help: '尿液、粪便、血清、血浆等仅含极少量脱落/游离细胞或基因的样本，按主管部门常见问题解答口径不再纳入人遗材料管理范围。',
    when: (a) => get(a, 'resource_kind') !== 'info_only',
    options: [
      { value: 'whole_blood', label: '全血' },
      { value: 'tissue', label: '组织 / 组织切片' },
      { value: 'cells', label: '细胞（含细胞系）' },
      { value: 'semen', label: '精液' },
      { value: 'csf', label: '脑脊液' },
      { value: 'effusion', label: '胸 / 腹腔积液' },
      { value: 'smear', label: '血 / 骨髓涂片' },
      { value: 'hair', label: '毛发（带毛囊）' },
      { value: 'urine', label: '尿液', hint: 'FAQ 口径：不纳入材料管理' },
      { value: 'feces', label: '粪便', hint: 'FAQ 口径：不纳入材料管理' },
      { value: 'serum', label: '血清', hint: 'FAQ 口径：不纳入材料管理' },
      { value: 'plasma', label: '血浆', hint: 'FAQ 口径：不纳入材料管理' },
      { value: 'acellular', label: '其他不含细胞的分泌物、体液、拭子', hint: '不纳入材料管理' },
    ],
  },
  {
    id: 'info_type',
    layer: 2,
    layerLabel: L2,
    multi: true,
    text: '涉及哪些类型的数据信息？（可多选）',
    help: '单纯的临床数据、影像数据、蛋白质数据和代谢数据不属于人遗信息。',
    when: (a) => get(a, 'resource_kind') !== 'material_only',
    options: [
      { value: 'gene', label: '基因 / 基因组数据（含测序数据）' },
      { value: 'transcriptome', label: '转录组数据' },
      { value: 'epigenome', label: '表观组数据' },
      { value: 'biomarker', label: '核酸类生物标志物信息' },
      { value: 'clinical', label: '临床数据', hint: '不纳入人遗信息管理' },
      { value: 'imaging', label: '影像数据', hint: '不纳入人遗信息管理' },
      { value: 'protein', label: '蛋白质数据', hint: '不纳入人遗信息管理' },
      { value: 'metabolic', label: '代谢数据', hint: '不纳入人遗信息管理' },
    ],
  },

  // ───────── 第 3 层：活动识别 ─────────
  {
    id: 'activities',
    layer: 3,
    layerLabel: L3,
    multi: true,
    text: '项目包含哪些活动？（可多选）',
    help: '不同活动对应不同的审批 / 备案 / 报告轨道，可多选，系统将逐条评估。',
    when: (a) => deriveRegulatedMaterial(a) || deriveRegulatedInfo(a),
    options: [
      { value: 'collect', label: '采集', hint: '从人遗资源提供者处获取样本' },
      { value: 'bank', label: '保藏', hint: '长期保存、建立样本库 / 数据库，为科研提供基础平台' },
      { value: 'use', label: '境内利用', hint: '纯中方单位在境内开展研究使用' },
      { value: 'coop', label: '与外方合作研究 / 临床试验', hint: '外方单位参与研究、申办或实质获益' },
      { value: 'export', label: '材料出境', hint: '将样本运送、邮寄、携带出境' },
      { value: 'info_out', label: '信息对外提供 / 开放使用', hint: '向外方提供或开放使用人遗信息（含论文数据开放）' },
    ],
  },

  // ───────── 第 4 层：触发与豁免 ─────────
  // —— 采集 ——
  {
    id: 'collect_family',
    layer: 4,
    layerLabel: L4,
    text: '采集是否涉及重要遗传家系？',
    help: '重要遗传家系：患遗传性疾病、具有遗传性特殊体质或生理特征的有血缘关系群体，且涉及三代或以上；高血压、糖尿病、红绿色盲、血友病等常见疾病不在此列。',
    when: (a) => has(a, 'activities', 'collect') && deriveUnitType(a) !== 'foreign',
    options: [
      { value: 'yes', label: '是' },
      { value: 'no', label: '否' },
      { value: 'unclear', label: '不清楚' },
    ],
  },
  {
    id: 'collect_region',
    layer: 4,
    layerLabel: L4,
    text: '采集是否涉及特定地区人类遗传资源？',
    help: '特定地区：在隔离或特殊环境下长期生活，具有特殊体质特征或适应性性状的人群；不以是否为少数民族聚居区划分。',
    when: (a) => has(a, 'activities', 'collect') && deriveUnitType(a) !== 'foreign',
    options: [
      { value: 'yes', label: '是' },
      { value: 'no', label: '否' },
      { value: 'unclear', label: '不清楚' },
    ],
  },
  {
    id: 'collect_scale',
    layer: 4,
    layerLabel: L4,
    text: '采集是否用于大规模人群研究且人数大于 3000 例？',
    help: '大规模人群研究包括队列研究、横断面研究、临床研究、体质学研究等。',
    when: (a) => has(a, 'activities', 'collect') && deriveUnitType(a) !== 'foreign',
    options: [
      { value: 'yes', label: '是（> 3000 例）' },
      { value: 'no', label: '否' },
      { value: 'unclear', label: '不清楚' },
    ],
  },
  {
    id: 'collect_ctrial',
    layer: 4,
    layerLabel: L4,
    text: '该大规模采集是否属于为取得药品、医疗器械在我国上市许可的临床试验？',
    when: (a) => get(a, 'collect_scale') === 'yes',
    options: [
      { value: 'yes', label: '是（无需采集许可）' },
      { value: 'no', label: '否' },
    ],
  },
  // —— 保藏 ——
  {
    id: 'bank_purpose',
    layer: 4,
    layerLabel: L4,
    text: '该保存行为是否仅为教学目的，或检测后按法规要求 / 临床研究方案约定的临时存储？',
    help: '保藏是指将来源合法的人遗资源保存在适宜条件下、用于未来科学研究的行为；临时存储不构成保藏。',
    when: (a) => has(a, 'activities', 'bank') && deriveUnitType(a) !== 'foreign',
    options: [
      { value: 'yes', label: '是（属于临时存储，不构成保藏）' },
      { value: 'no', label: '否（属于长期保藏 / 建库）' },
    ],
  },
  // —— 国际合作 ——
  {
    id: 'coop_role',
    layer: 4,
    layerLabel: L4,
    text: '外方在项目中的参与方式是？',
    help: '外方仅提供研究用药或部分经费、不获取数据、不共享成果的，不纳入国际合作管理；仅 EDC 供应商等服务商为外方的，也不需要申报。',
    when: (a) => has(a, 'activities', 'coop'),
    options: [
      { value: 'substantial', label: '外方实质性参与研究（获取数据 / 共享成果 / 共同实施）' },
      { value: 'funding_only', label: '外方仅提供药物或经费资助，不获取数据、不共享成果' },
      { value: 'service_only', label: '仅 EDC 供应商、数据统计公司等服务方为外方' },
    ],
  },
  {
    id: 'coop_purpose',
    layer: 4,
    layerLabel: L4,
    text: '合作目的是否为取得药品、医疗器械在我国上市许可的临床试验？',
    when: (a) => has(a, 'activities', 'coop') && get(a, 'coop_role') === 'substantial',
    options: [
      { value: 'yes', label: '是（注册上市目的的临床试验）' },
      { value: 'no', label: '否（一般科学研究 / IIT 等）' },
    ],
  },
  {
    id: 'coop_insite',
    layer: 4,
    layerLabel: L4,
    text: '人遗资源的采集、检测、分析和剩余样本处理，是否全部在临床医疗卫生机构内进行，或由临床试验方案指定的境内单位进行？',
    when: (a) => get(a, 'coop_purpose') === 'yes',
    options: [
      { value: 'yes', label: '是' },
      { value: 'no', label: '否' },
      { value: 'unclear', label: '不清楚' },
    ],
  },
  {
    id: 'coop_exploratory',
    layer: 4,
    layerLabel: L4,
    text: '该临床试验是否包含探索性研究部分？',
    help: '为上市许可目的的临床试验中涉及的探索性研究部分，应当申请国际合作科学研究行政许可。',
    when: (a) => get(a, 'coop_purpose') === 'yes',
    options: [
      { value: 'yes', label: '是' },
      { value: 'no', label: '否' },
    ],
  },
  // 多中心题依赖 coop_role === 'substantial'，必须放在 role/purpose/insite/exploratory 之后，
  // 否则它会插在被依赖题之前，正向作答永远走不到
  {
    id: 'coop_multicenter',
    layer: 4,
    layerLabel: L4,
    text: '该国际合作是否涉及多中心临床研究？',
    help: '多中心临床研究不得拆分后分别申请行政许可或备案；组长单位通过伦理审查后，即可由申办方或组长单位统一申请。',
    when: (a) => has(a, 'activities', 'coop') && get(a, 'coop_role') === 'substantial',
    options: [
      { value: 'yes', label: '是（多中心）' },
      { value: 'no', label: '否（单中心）' },
    ],
  },
  // —— 材料出境 ——
  {
    id: 'export_only_exempt',
    layer: 4,
    layerLabel: L4,
    text: '出境材料是否仅涉及尿液、粪便、血清或血浆？',
    help: '按主管部门常见问题解答口径，上述材料不再纳入人遗材料管理范围，其出境无需申报。',
    when: (a) => has(a, 'activities', 'export'),
    options: [
      { value: 'yes', label: '是（仅上述材料）' },
      { value: 'no', label: '否（还涉及其他材料）' },
    ],
  },
  // —— 信息对外提供 ——
  {
    id: 'info_public',
    layer: 4,
    layerLabel: L4,
    text: '是否仅利用已公开的人类遗传资源数据？',
    when: (a) => has(a, 'activities', 'info_out'),
    options: [
      { value: 'yes', label: '是（仅使用已公开数据）' },
      { value: 'no', label: '否' },
    ],
  },
  {
    id: 'info_within_coop',
    layer: 4,
    layerLabel: L4,
    text: '该信息对外提供是否属于：已获批国际合作 / 已备案临床试验实施过程中，按合作协议约定由合作双方使用的信息？',
    when: (a) => has(a, 'activities', 'info_out') && get(a, 'info_public') === 'no',
    options: [
      { value: 'yes', label: '是（协议已约定双方使用）' },
      { value: 'no', label: '否' },
    ],
  },
  {
    id: 'info_security',
    layer: 4,
    layerLabel: L4,
    multi: true,
    text: '拟对外提供 / 开放使用的信息是否涉及以下情形？（可多选，无则跳过）',
    help: '涉及以下情形的，应当通过主管部门组织的安全审查后方可对外提供或开放使用。',
    when: (a) => has(a, 'activities', 'info_out') && get(a, 'info_public') === 'no' && get(a, 'info_within_coop') === 'no',
    options: [
      { value: 'family', label: '重要遗传家系的人遗信息' },
      { value: 'region', label: '特定地区的人遗信息' },
      { value: 'seq500', label: '人数大于 500 例的外显子组测序、基因组测序信息' },
      { value: 'none', label: '均不涉及' },
    ],
  },

  // ───────── 已获批项目变更评估流程 ─────────
  {
    id: 'ch_track',
    flow: 'existing',
    layer: 1,
    layerLabel: '第 1 步 · 事项类型',
    text: '项目已持有的人遗事项是哪一种？',
    options: [
      { value: 'approval_collect', label: '采集行政许可' },
      { value: 'approval_bank', label: '保藏行政许可' },
      { value: 'approval_coop', label: '国际合作科学研究行政许可' },
      { value: 'filing_trial', label: '国际合作临床试验备案' },
    ],
  },
  {
    id: 'ch_unit_foreign',
    flow: 'existing',
    layer: 2,
    layerLabel: '第 2 步 · 特殊情形',
    text: '项目进行中，是否有合作方的单位性质变为外方单位（如被境外收购、股权结构变化导致境外实控）？',
    help: '正在进行的全中方项目，因合作方变为外方单位的，应当先暂停项目，待国际合作获批或备案取得备案号后方可继续。',
    options: [
      { value: 'yes', label: '是' },
      { value: 'no', label: '否' },
    ],
  },
  {
    id: 'ch_convert',
    flow: 'existing',
    layer: 2,
    layerLabel: '第 2 步 · 特殊情形',
    text: '是否涉及许可与备案之间的转换情形？',
    options: [
      { value: 'filing_to_approval', label: '已备案项目因条件改变，需转为国际合作科学研究许可' },
      { value: 'approval_to_filing', label: '已获批的许可项目，现符合临床试验备案情形' },
      { value: 'none', label: '均不涉及' },
    ],
  },
  {
    id: 'ch_items_collect',
    flow: 'existing',
    layer: 3,
    layerLabel: '第 3 步 · 变更内容',
    multi: true,
    text: '采集许可项目拟发生哪些变化？（可多选）',
    when: (a) => get(a, 'ch_track') === 'approval_collect',
    options: [
      { value: 'participants', label: '采集活动参与单位变更' },
      { value: 'purpose', label: '采集目的变更' },
      { value: 'plan', label: '采集方案或采集内容变更' },
      { value: 'name_only', label: '仅事项名称变更' },
      { value: 'none', label: '暂无变化（仅咨询延续 / 报告义务）' },
    ],
  },
  {
    id: 'ch_items_bank',
    flow: 'existing',
    layer: 3,
    layerLabel: '第 3 步 · 变更内容',
    multi: true,
    text: '保藏许可项目拟发生哪些变化？（可多选）',
    when: (a) => get(a, 'ch_track') === 'approval_bank',
    options: [
      { value: 'purpose', label: '保藏目的变更' },
      { value: 'plan', label: '保藏方案变更' },
      { value: 'content', label: '保藏内容变更' },
      { value: 'name_only', label: '仅事项名称变更' },
      { value: 'none', label: '暂无变化（仅咨询延续 / 报告义务）' },
    ],
  },
  {
    id: 'ch_items_coop',
    flow: 'existing',
    layer: 3,
    layerLabel: '第 3 步 · 变更内容',
    multi: true,
    text: '国际合作许可项目拟发生哪些变化？（可多选）',
    when: (a) => get(a, 'ch_track') === 'approval_coop',
    options: [
      { value: 'purpose_content', label: '研究目的、研究内容变更' },
      { value: 'hgr_change', label: '人遗资源种类、数量、用途变更' },
      { value: 'key_parties', label: '申办方、组长单位、CRO、第三方实验室变更' },
      { value: 'qty_within_10', label: '仅人遗总量累计不超获批数量 10%（方案不变）' },
      { value: 'other_participants', label: '上述关键单位以外的参与单位变更' },
      { value: 'name_only', label: '合作方法人单位名称变更' },
      { value: 'plan_no_hgr', label: '方案变更但不涉及人遗种类 / 数量 / 用途，且不超已批范围' },
      { value: 'none', label: '暂无变化（仅咨询延续 / 报告义务）' },
    ],
  },
  {
    id: 'ch_items_filing',
    flow: 'existing',
    layer: 3,
    layerLabel: '第 3 步 · 变更内容',
    multi: true,
    text: '临床试验备案项目拟发生哪些变化？（可多选）',
    when: (a) => get(a, 'ch_track') === 'filing_trial',
    options: [
      { value: 'hgr_change', label: '人遗资源种类、数量、用途变更' },
      { value: 'major', label: '合作方、研究方案、研究内容、研究目的等重大事项变更' },
      { value: 'plan_no_hgr', label: '方案或内容变更，但不涉及人遗种类 / 数量 / 用途变化' },
      { value: 'none', label: '暂无变化（仅咨询延续 / 报告义务）' },
    ],
  },
]

/** 按当前回答计算应出现的题目序列 */
export function visibleQuestions(a: Answers): Question[] {
  const flow = (a._flow as string | undefined) ?? 'new'
  return questions.filter((q) => (q.flow ?? 'new') === flow && (!q.when || q.when(a)))
}
