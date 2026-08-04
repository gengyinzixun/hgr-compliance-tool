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
export const RULESET_VERSION = '1.5.0'
export const RULESET_REVIEWED_AT = '2026-08-04'

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
  /** 状态说明（如已有新版解答、修订动态） */
  statusNote?: string
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
    name: '《人类遗传资源管理条例实施细则》（2023）',
    issuer: '科学技术部（2023 年第 21 号令）',
    currentAuthority: '国家卫生健康委员会',
    promulgated: '2023-05-26',
    effective: '2023-07-01',
    status: 'outdated',
    statusNote:
      '国家卫健委已于 2026-05-08 发布本细则修订征求意见稿（尚未生效），拟调整采集许可门槛、省级委托等安排；正式修订发布后需复核规则库。',
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
      '卫健委科教司已发布 2025-03-27 新版《问题解答》。2026-08-04 完成逐条比对：19/20 处引用口径一致、继续有效；仅"对外提供人遗资源的提供方仅指中方单位"一条新版未收录（该结论由条例第七条等 A 级条文支撑）。详见 docs/faq-2025-比对报告.md。',
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
