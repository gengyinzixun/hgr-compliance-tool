/**
 * 术语官方定义表：法规与政策解答中有明确定义的术语，逐字引用并标注条款出处。
 *
 * 用法：
 * - 向导中通过 Question.terms 关联到相关题目，随题展示定义；
 * - 评估报告与 Word 导出按 relevantTerms() 输出"相关术语官方定义"区块；
 * - 定义逐字引用，修订法规时只需核对本表。
 */

import type { Answers } from './types'

export interface GlossaryTerm {
  id: string
  term: string
  /** 官方定义（逐字引用，可做最小删减并以省略号标示） */
  definition: string
  /** 条款出处 */
  source: string
  /** 关联法规注册表 */
  regulationId: 'tiaoli' | 'xize' | 'faq' | 'faq2025' | 'faq2025s'
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  hgr_material: {
    id: 'hgr_material',
    term: '人类遗传资源材料',
    definition:
      '是指含有人体基因组、基因等遗传物质的器官、组织、细胞等遗传材料，包括所有类型细胞、全血、组织或者组织切片、精液、脑脊液、胸腔积液、腹腔积液、血涂片、骨髓涂片、毛发（带毛囊）等以及从其衍生获取的遗传物质；不包括其他不含细胞的人体分泌物、体液、拭子等以及可能含有极少量脱落、残留、游离的细胞或者核酸的尿液、粪便、血清、血浆等生物样本。',
    source: '《实施细则》（2026）第三条',
    regulationId: 'xize',
  },
  hgr_info: {
    id: 'hgr_info',
    term: '人类遗传资源信息',
    definition:
      '是指利用人类遗传资源材料产生的数据等信息资料，包括人类基因、基因组、转录组、表观组等核酸序列信息，以及与此关联的疾病等信息资料；不包括单纯的临床数据、影像数据、蛋白质数据和代谢数据等。',
    source: '《实施细则》（2026）第三条',
    regulationId: 'xize',
  },
  chinese_unit: {
    id: 'chinese_unit',
    term: '中方单位',
    definition:
      '2026 版实施细则未保留"中方单位"的正面定义（旧版第 11 条已删除）。涉外项目的主体资格判断应回到《条例》与主管部门口径；设在港澳的内资实控机构，可以参照中方单位有关规定在我国境内从事相关活动。',
    source: '《实施细则》（2026）第六十条（港澳内资实控参照条款）',
    regulationId: 'xize',
  },
  foreign_unit: {
    id: 'foreign_unit',
    term: '外方单位',
    definition:
      '是指境外组织及境外组织、个人设立、实际控制或者持有、间接持有百分之五十以上的股份、股权、表决权、财产份额等权益的机构。境外个人以及外方单位不得在我国境内采集、保藏我国人类遗传资源，不得向境外提供我国人类遗传资源。',
    source: '《实施细则》（2026）第五十九条、第九条',
    regulationId: 'xize',
  },
  actual_control: {
    id: 'actual_control',
    term: '外方单位认定（50% 权益）',
    definition:
      '2026 版实施细则第 59 条将外方单位简化为：境外组织及境外组织、个人设立、实际控制或者持有、间接持有 50% 以上的股份、股权、表决权、财产份额等权益的机构。旧版第 12 条"不足 50% 但足以支配或施加重大影响"的模糊标准未保留。',
    source: '《实施细则》（2026）第五十九条',
    regulationId: 'xize',
  },
  key_pedigree: {
    id: 'key_pedigree',
    term: '重要遗传家系',
    definition:
      '是指患有遗传性疾病、具有遗传性特殊体质或者生理特征的有血缘关系的群体，且该群体中患有遗传性疾病、具有遗传性特殊体质或者生理特征的成员涉及三代或者三代以上。高血压、糖尿病、红绿色盲、血友病等常见疾病不在此列。',
    source: '《实施细则》（2026）第十三条',
    regulationId: 'xize',
  },
  specific_region: {
    id: 'specific_region',
    term: '特定地区人类遗传资源',
    definition:
      '是指在相对隔离或者特殊环境下长期生活，并具有特殊体质特征或者在生理特征方面有适应性性状发生的人类遗传资源。2026 版细则改为清单目录制：须属于第 15 条建立并正式公布的清单目录内，采集才需许可。特定地区不以是否为少数民族聚居区为划分依据。',
    source: '《实施细则》（2026）第十三条、第十五条',
    regulationId: 'xize',
  },
  large_scale_study: {
    id: 'large_scale_study',
    term: '大规模人群研究',
    definition:
      '包括但不限于队列研究、横断面研究、临床研究、体质学研究等。2026 版细则第 16 条：用于大规模人群研究且人数大于 10000 例的采集活动需申请采集许可（较旧版 >3000 例提高）；为取得药品和医疗器械在我国上市许可的临床试验涉及的采集活动不在此列，且禁止拆分、化整为零规避许可。',
    source: '《实施细则》（2026）第十六条',
    regulationId: 'xize',
  },
  preservation: {
    id: 'preservation',
    term: '保藏',
    definition:
      '是指将具有合法来源的人类遗传资源保存在适宜环境条件下、保证其质量和安全、仅用于科学研究的行为。不包括：①以临床诊疗和教学为主要目的、兼顾科研的样本存储；②以已上市药品和医疗器械生产为目的而开展的样本存储；③在实验室检测后依照法律法规要求或者临床研究方案约定的临时存储。',
    source: '《实施细则》（2026）第二十一条',
    regulationId: 'xize',
  },
  clinical_institution: {
    id: 'clinical_institution',
    term: '医疗卫生机构（国际合作临床试验备案）',
    definition: '2026 版细则第 27 条将备案主体由"临床医疗卫生机构"放宽为"医疗卫生机构"；材料在机构内采集、在机构或方案/协议指定的境内单位检测分析和剩余材料处理的，可适用备案。',
    source: '《实施细则》（2026）第二十七条',
    regulationId: 'xize',
  },
  third_party_lab: {
    id: 'third_party_lab',
    term: '第三方实验室（认定口径）',
    definition:
      '全血在医疗卫生机构处理为血清或血浆送至检测单位的，且不进行基因、基因组、转录组、表观组及核酸类生物标志物等检测，该检测单位不再纳入第三方实验室管理；采集的全血送至检测单位进行处理获得血清或血浆的，该检测单位仍按第三方实验室管理。',
    source: '《人类遗传资源管理常见问题解答》（2025.03）第四部分第 3 问',
    regulationId: 'faq2025',
  },
  immortalized_cell_line: {
    id: 'immortalized_cell_line',
    term: '永生化细胞系 / CDX / PDX（监管口径）',
    definition:
      '已去除样本相关信息、无法追溯至个人的用于生产或科学研究的永生化细胞系，不纳入人类遗传资源监管范围。细胞系来源的小鼠移植模型（Cell-derived Xenograft，CDX）不属于人类遗传资源材料；患者肿瘤组织来源的小鼠移植模型（Patient-derived tumor Xenograft，PDX）属于人类遗传资源材料，如涉及 PDX 模型出境，应申报人类遗传资源材料出境行政许可。',
    source: '《人类遗传资源管理有关问题解答》之一、之二',
    regulationId: 'faq2025s',
  },
  analysis_unit: {
    id: 'analysis_unit',
    term: '分析单位',
    definition: '国际合作临床试验备案中的分析单位是指涉及人类遗传资源基因信息或核酸类生物标志物信息分析处理的单位。',
    source: '《人类遗传资源管理常见问题解答》（2025.03）第二部分第 11 问',
    regulationId: 'faq2025',
  },
  other_unit: {
    id: 'other_unit',
    term: '其他单位',
    definition:
      '国际合作中的其他单位是指申办方、组长单位、合同研究组织、第三方实验室、参与医疗卫生机构以外可接触到管理范围内的人类遗传资源材料或信息进行实质性参与的相关单位。',
    source: '《人类遗传资源管理常见问题解答》（2025.03）第二部分第 8 问',
    regulationId: 'faq2025',
  },
  counting_rule: {
    id: 'counting_rule',
    term: '数量口径（以上 / 不超过 / 大于 / 不足）',
    definition:
      '注意：旧版第 76 条（工作日/自然日）、第 77 条（"以上""不超过"含本数、"大于""不足"不含本数）在新版中未保留。引用数字门槛时，应回到《行政许可法》等一般规则与主管部门解释，不宜再援引细则条款。新细则第 16 条明确"大于一万例"、第 34 条明确"不超过获批数量百分之十或者十例"。',
    source: '旧版第 76、77 条已删除；参见《实施细则》（2026）第十六条、第三十四条',
    regulationId: 'xize',
  },
}

/** 按回答推导本次评估涉及的术语（用于报告"相关术语官方定义"区块） */
export function relevantTerms(a: Answers): GlossaryTerm[] {
  const ids = new Set<string>(['hgr_material', 'hgr_info'])
  const m = (a.material_type as string[] | undefined) ?? []
  const acts = (a.activities as string[] | undefined) ?? []

  if (a.unit_type === 'unsure' || a.unit_type === 'foreign' || a.unit_type === 'hk_macao_inland') {
    ids.add('chinese_unit')
    ids.add('foreign_unit')
  }
  if (a.unit_type === 'unsure') ids.add('actual_control')
  if (m.includes('serum') || m.includes('plasma') || m.includes('whole_blood')) ids.add('third_party_lab')
  if (m.includes('cells')) ids.add('immortalized_cell_line')
  if (acts.includes('collect')) {
    ids.add('key_pedigree')
    ids.add('specific_region')
    ids.add('large_scale_study')
  }
  if (acts.includes('bank')) ids.add('preservation')
  if (acts.includes('coop')) {
    ids.add('clinical_institution')
    ids.add('analysis_unit')
    ids.add('other_unit')
  }
  if (acts.includes('info_out')) ids.add('hgr_info')
  ids.add('counting_rule')

  return [...ids].map((id) => GLOSSARY[id]).filter(Boolean)
}
