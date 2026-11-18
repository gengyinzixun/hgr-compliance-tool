/**
 * 法规版本注册表：规则引擎所依据法规的版本快照与保鲜状态。
 *
 * 用法：
 * - 每条 Citation 通过 regulationId 关联到本表中的一部法规；
 * - 评估结果页与 Word 报告据此生成"评估依据（法规版本快照）"区块，
 *   让使用者明确知道结论对应的是哪一版法规；
 * - 法规修订时只需更新本表 + 规则内容，status 字段驱动"已有更新"提示。
 *
 * 日期与版本信息均为公开官方口径；修订法规后请同步更新 reviewedAt。
 */

/** 规则库版本快照：每次依据新法规/新口径更新规则后递增并更新复核日期 */
export const RULESET_VERSION = '2.0.0'
export const RULESET_REVIEWED_AT = '2026-11-11'

export type RegulationStatus =
  | 'current' // 现行有效，规则已对齐
  | 'outdated' // 已有更新版本/新口径发布，规则尚未完全对齐
  | 'practice' // 非规范性文件（实践惯例），无版本概念

export interface RegulationMeta {
  id: string
  /** 引用中展示的完整名称（含版本标识） */
  name: string
  /** 公布 / 发布机关 */
  issuer: string
  /** 现行主管机关 */
  currentAuthority: string
  /** 公布日期 */
  promulgated: string
  /** 施行 / 适用日期 */
  effective: string
  /** 保鲜状态 */
  status: RegulationStatus
  /** 状态说明（内部维护记录：比对结论、落地细节等，仅供规则库维护，不在报告界面 / Word 中展示） */
  statusNote?: string
  /** 用户向时效提示（展示在报告界面与 Word 中，一两句话，面向使用者的口径说明） */
  userNote?: string
}

export const REGULATIONS: Record<string, RegulationMeta> = {
  tiaoli: {
    id: 'tiaoli',
    name: '《中华人民共和国人类遗传资源管理条例》（2024 修订）',
    issuer: '国务院（2019 年第 717 号令公布；2024 年第 777 号令修订）',
    currentAuthority: '国家卫生健康委员会',
    promulgated: '2019-05-28 公布，2024-03-10 修订',
    effective: '2019-07-01 施行，2024 修订自 2024-05-01 施行',
    status: 'current',
  },
  xize: {
    id: 'xize',
    name: '《人类遗传资源管理条例实施细则》（2026，国家卫生健康委员会令第 16 号）',
    issuer: '国家卫生健康委员会（2026 年第 16 号令；2026-08-26 委务会议通过，主任雷海潮签发）',
    currentAuthority: '国家卫生健康委员会',
    promulgated: '2026-11-11 公布',
    effective: '2026-11-11 起施行（自公布之日起施行）',
    status: 'current',
    statusNote:
      '2026-11-11 起施行，第 61 条明确科技部 2023-05-26 公布的第 21 号令同时废止，无过渡期。新规 8 章 61 条（旧版 7 章 78 条），条号全量重排；监管主体由科技部改为国家卫健委，省级为省级人民政府人类遗传资源主管部门。v2.0.0 已完成全量换版：采集门槛 3000→10000 例并改清单目录制、保藏定义收窄为"仅用于科学研究"、年度报告内容替换、申请材料清单入法、细则层面删除安全审查与处罚专章、许可/备案有效期按申请确定、新增论文会议视为完成事先报告与三类免报告情形。逐条映射见 docs/换版条号映射-16号令.md。',
    userNote: '本细则已于 2026-11-11 换版施行（国家卫健委令第 16 号），旧版第 21 号令同时废止、无过渡期；本报告按新版条款评估。在办事项的适用口径请以属地主管部门确认为准。',
  },
  xize2023: {
    id: 'xize2023',
    name: '《人类遗传资源管理条例实施细则》（2023，科学技术部令第 21 号，已废止）',
    issuer: '科学技术部（2023 年第 21 号令）',
    currentAuthority: '国家卫生健康委员会',
    promulgated: '2023-05-26',
    effective: '2023-07-01 施行，2026-11-11 废止',
    status: 'outdated',
    statusNote:
      '已被国家卫健委令第 16 号取代，本规则库不再引用；仅为历史沿革与旧版文件核对保留。旧条号全部失效，客户存量体系文件/SOP/申报模板须全量替换。',
    userNote: '该版本已于 2026-11-11 废止，不再作为申报依据。',
  },
  faq: {
    id: 'faq',
    name: '《人类遗传资源管理常见问题解答》（2023.09）',
    issuer: '科学技术部',
    currentAuthority: '国家卫生健康委员会',
    promulgated: '2023-09',
    effective: '2023-09',
    status: 'outdated',
    statusNote:
      '卫健委科教司已发布 2025-03-27 新版《问题解答》。2026-08-04 完成逐条比对：19/20 处引用口径一致、继续有效；仅"对外提供人遗资源的提供方仅指中方单位"一条新版未收录（该结论由条例第七条等 A 级条文支撑）。详见 docs/faq-2025-比对报告.md。2026-11-11 细则换版后，其中"尿液/粪便/血清/血浆不纳入材料管理"已由新细则第三条正文吸收（口径不变、层级升为 A）；与已删除的安全审查、外方伦理审查例外相关的口径须以后续服务指南为准，暂不作撤销判断。',
    userNote: '主管部门已发布 2025 年新版《问题解答》；经逐条比对，本报告引用的该版口径与新版一致、继续有效。细则换版后，与新规条文相关的口径以国家卫健委后续服务指南为准。',
  },
  faq2025: {
    id: 'faq2025',
    name: '《人类遗传资源管理常见问题解答》（2025.03）',
    issuer: '国家卫生健康委员会科教司',
    currentAuthority: '国家卫生健康委员会',
    promulgated: '2025-03-27',
    effective: '2025-03-27',
    status: 'current',
    statusNote:
      '现行官方问答口径；其后卫健委另发布《人类遗传资源管理有关问题解答》之一至之五，已单列 faq2025s 注册并于 2026-08-04 完成比对。',
  },
  faq2025s: {
    id: 'faq2025s',
    name: '《人类遗传资源管理有关问题解答》之一至之五（2025）',
    issuer: '国家卫生健康委员会科教司',
    currentAuthority: '国家卫生健康委员会',
    promulgated: '2025-04-01 至 2025-10-11（分五期发布）',
    effective: '2025-04-01',
    status: 'current',
    statusNote:
      '之一 2025-04-01（商业化人源细胞系）、之二 2025-04-09（CDX/PDX）、之三 2025-04-17（CAR-T 出境）、之四 2025-04-25（空白基质国际合作）、之五 2025-10-11（申报数量、延续时限）。2026-08-04 完成逐条比对并全部落地：之五 2 条为义务文案增强（v1.4.0）；之一/之二落地为题库 cells_deidentified 分支与 out-of-scope 专用结论，之三落地为 export-exempt-clinical 豁免结论，之四补入国际合作题目帮助文案（v1.5.0）。详见 docs/问题解答之一至之五-比对报告.md。',
  },
  practice: {
    id: 'practice',
    name: '实务操作惯例（非规范性文件）',
    issuer: '——',
    currentAuthority: '——',
    promulgated: '——',
    effective: '——',
    status: 'practice',
    statusNote: '非法规明文规定，系申报实践中的通行做法，重大事项建议与主管部门沟通确认。',
    userNote: '非法规明文规定，系申报实践中的通行做法，重大事项建议与主管部门沟通确认。',
  },
}

/** 按引用出现顺序去重，取出本次评估实际依据的法规清单 */
export function collectRegulations(regulationIds: string[]): RegulationMeta[] {
  const seen = new Set<string>()
  const out: RegulationMeta[] = []
  for (const id of regulationIds) {
    if (seen.has(id)) continue
    seen.add(id)
    const meta = REGULATIONS[id]
    if (meta) out.push(meta)
  }
  return out
}

export const STATUS_LABEL: Record<RegulationStatus, string> = {
  current: '现行有效',
  outdated: '已有更新',
  practice: '实践惯例',
}
