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
    definition: '是指含有人体基因组、基因等遗传物质的器官、组织、细胞等遗传材料。',
    source: '《中华人民共和国人类遗传资源管理条例》第二条',
    regulationId: 'tiaoli',
  },
  hgr_info: {
    id: 'hgr_info',
    term: '人类遗传资源信息',
    definition:
      '是指利用人类遗传资源材料产生的数据等信息资料；包括利用人类遗传资源材料产生的人类基因、基因组数据等信息资料，不包括临床数据、影像数据、蛋白质数据和代谢数据。',
    source: '《条例》第二条；《实施细则》第二条',
    regulationId: 'xize',
  },
  chinese_unit: {
    id: 'chinese_unit',
    term: '中方单位',
    definition:
      '我国科研机构、高等学校、医疗机构或者企业。设在港澳的内资实控机构视为中方单位。',
    source: '《实施细则》第十一条',
    regulationId: 'xize',
  },
  foreign_unit: {
    id: 'foreign_unit',
    term: '外方单位',
    definition:
      '境外组织及境外组织、个人设立或者实际控制的机构，以及境外个人。外方单位不得在我国境内采集、保藏我国人类遗传资源，不得向境外提供我国人类遗传资源。',
    source: '《实施细则》第十一条',
    regulationId: 'xize',
  },
  actual_control: {
    id: 'actual_control',
    term: '实际控制（外方单位认定）',
    definition:
      '包括：（一）境外组织、个人持有或者间接持有机构 50% 以上的股份、股权、表决权、财产份额或者其他类似权益；（二）不足 50%，但所享有的表决权或者其他权益足以对机构的决策、管理等行为进行支配或者施加重大影响；（三）通过投资关系、协议或者其他安排，足以对机构的决策、管理等行为进行支配或者施加重大影响；（四）法律、行政法规、规章规定的其他情形。',
    source: '《实施细则》第十二条',
    regulationId: 'xize',
  },
  key_pedigree: {
    id: 'key_pedigree',
    term: '重要遗传家系',
    definition:
      '是指患有遗传性疾病、具有遗传性特殊体质或者生理特征的有血缘关系的群体，且该群体中患有遗传性疾病、具有遗传性特殊体质或者生理特征的成员涉及三代或者三代以上。高血压、糖尿病、红绿色盲、血友病等常见疾病不在此列。',
    source: '《实施细则》第二十七条第一款（一）',
    regulationId: 'xize',
  },
  specific_region: {
    id: 'specific_region',
    term: '特定地区人类遗传资源',
    definition:
      '是指在隔离或者特殊环境下长期生活，并具有特殊体质特征或者在生理特征方面有适应性性状发生的人类遗传资源。特定地区不以是否为少数民族聚居区为划分依据。',
    source: '《实施细则》第二十七条第一款（二）',
    regulationId: 'xize',
  },
  large_scale_study: {
    id: 'large_scale_study',
    term: '大规模人群研究',
    definition:
      '包括但不限于队列研究、横断面研究、临床研究、体质学研究等。用于大规模人群研究且人数大于 3000 例的采集活动需申请采集许可；为取得药品和医疗器械在我国上市许可的临床试验涉及的采集活动不在此列。',
    source: '《实施细则》第二十七条第一款（三）',
    regulationId: 'xize',
  },
  preservation: {
    id: 'preservation',
    term: '保藏',
    definition:
      '是指将有合法来源的人类遗传资源保存在适宜环境条件下，保证其质量和安全，用于未来科学研究的行为；不包括以教学为目的、在实验室检测后按照法律法规要求或者临床研究方案约定的临时存储行为。',
    source: '《实施细则》第二十八条第二款',
    regulationId: 'xize',
  },
  clinical_institution: {
    id: 'clinical_institution',
    term: '临床医疗卫生机构',
    definition: '是指在我国相关部门备案，依法开展临床试验的医疗机构、疾病预防控制机构等。',
    source: '《实施细则》第三十二条第二款',
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
    definition: '实施细则中涉及期限的规定，注明为工作日的，不包含法定节假日；所称"以上""不超过"均包含本数，"大于""不足"不包含本数。',
    source: '《实施细则》第七十六、七十七条',
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
