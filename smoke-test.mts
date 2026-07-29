import { evaluate } from './src/rules/evaluate'
import { visibleQuestions } from './src/rules/questions'

function ids(res: ReturnType<typeof evaluate>) {
  return res.conclusions.map((c) => `${c.type}:${c.id}`).join(', ')
}
let pass = 0
let fail = 0
function check(name: string, answers: any, expect: string[]) {
  const res = evaluate(answers)
  const got = res.conclusions.map((c) => c.id)
  const ok = expect.every((e) => got.includes(e))
  if (ok) { pass++; console.log(`PASS ${name} -> [${ids(res)}]`) }
  else { fail++; console.log(`FAIL ${name}\n  expect: ${expect.join(',')}\n  got: ${ids(res)}`) }
}

// 1. 中方采集重要遗传家系 -> 采集许可
check('中方+家系采集',
  { unit_type: 'chinese', resource_kind: 'material_only', material_type: ['whole_blood'], activities: ['collect'], collect_family: 'yes', collect_region: 'no', collect_scale: 'no' },
  ['collect-approval'])

// 2. 中方保藏+采集 -> 保藏许可且采集被吸收
check('中方+保藏吸收采集',
  { unit_type: 'chinese', resource_kind: 'material_only', material_type: ['tissue'], activities: ['collect', 'bank'], collect_family: 'yes', collect_region: 'no', collect_scale: 'no', bank_purpose: 'no' },
  ['bank-approval', 'collect-approval'])

// 3. 外方采集 -> 禁止
check('外方+采集',
  { unit_type: 'foreign', resource_kind: 'material_only', material_type: ['whole_blood'], activities: ['collect'] },
  ['foreign-prohibited'])

// 4. 信息对外提供+500例测序 -> 安全审查+事先报告
check('信息对外+安审',
  { unit_type: 'chinese', resource_kind: 'info_only', info_type: ['gene'], activities: ['info_out'], info_public: 'no', info_within_coop: 'no', info_security: ['seq500'] },
  ['info-security', 'info-report'])

// 5. 外方仅资助 -> 国际合作豁免
check('外方仅资助',
  { unit_type: 'chinese', resource_kind: 'both', material_type: ['whole_blood'], info_type: ['gene'], activities: ['coop'], coop_role: 'funding_only' },
  ['coop-exempt'])

// 6. 仅血清 -> 不纳入管理
check('仅血清',
  { unit_type: 'chinese', resource_kind: 'material_only', material_type: ['serum'] },
  ['out-of-scope'])

// 7. 上市临床试验备案路径
check('国际合作临床试验备案',
  { unit_type: 'chinese', resource_kind: 'material_only', material_type: ['whole_blood'], activities: ['coop'], coop_role: 'substantial', coop_purpose: 'yes', coop_insite: 'yes', coop_exploratory: 'no' },
  ['coop-filing'])

// 8. IIT -> 国际合作审批
check('IIT审批',
  { unit_type: 'chinese', resource_kind: 'material_only', material_type: ['whole_blood'], activities: ['coop'], coop_role: 'substantial', coop_purpose: 'no' },
  ['coop-approval'])

// 9. 材料出境合并审批
check('出境审批',
  { unit_type: 'chinese', resource_kind: 'material_only', material_type: ['cells'], activities: ['export'], export_only_exempt: 'no' },
  ['export-approval'])

// 10. 港澳内资实控 -> 中方
check('港澳内资实控',
  { unit_type: 'unsure', foreign_stake: 'yes', hk_macao: 'yes', resource_kind: 'material_only', material_type: ['whole_blood'], activities: ['collect'], collect_family: 'no', collect_region: 'no', collect_scale: 'no' },
  ['collect-exempt-general'])

// 11. 灰色地带: 单位性质不清
const ga = evaluate({ unit_type: 'unsure', foreign_stake: 'unclear', resource_kind: 'material_only', material_type: ['whole_blood'], activities: ['collect'], collect_family: 'no', collect_region: 'no', collect_scale: 'no' })
if (ga.grayAreas.length > 0 && ga.unitType === 'unclear') { pass++; console.log('PASS 灰色地带转人工') } else { fail++; console.log('FAIL 灰色地带') }

// 12. 向导流程: 外方选择后不应再问采集触发题
const qs = visibleQuestions({ unit_type: 'foreign', resource_kind: 'material_only', material_type: ['whole_blood'], activities: ['collect'] }).map((q) => q.id)
if (!qs.includes('collect_family')) { pass++; console.log('PASS 外方跳过采集触发题') } else { fail++; console.log('FAIL 外方不应出现 collect_family') }

// 13. 变更流程：国际合作许可重大事项 -> 变更审批
check('变更:许可重大事项',
  { _flow: 'existing', ch_track: 'approval_coop', ch_unit_foreign: 'no', ch_convert: 'none', ch_items_coop: ['hgr_change'] },
  ['ch-coop-variation', 'ch-routine'])

// 14. 变更流程：仅10%以内 -> 书面说明（无变更审批）
{
  const res = evaluate({ _flow: 'existing', ch_track: 'approval_coop', ch_unit_foreign: 'no', ch_convert: 'none', ch_items_coop: ['qty_within_10'] })
  const got = res.conclusions.map((c) => c.id)
  const ok = got.includes('ch-coop-notice') && !got.includes('ch-coop-variation')
  if (ok) { pass++; console.log('PASS 变更:10%以内书面说明') } else { fail++; console.log(`FAIL 变更:10%以内 -> ${got.join(',')}`) }
}

// 15. 备案转许可
check('备案转许可',
  { _flow: 'existing', ch_track: 'filing_trial', ch_unit_foreign: 'no', ch_convert: 'filing_to_approval', ch_items_filing: ['none'] },
  ['ch-convert-f2a'])

// 16. 合作方变外方
check('合作方变外方',
  { _flow: 'existing', ch_track: 'approval_coop', ch_unit_foreign: 'yes', ch_convert: 'none', ch_items_coop: ['none'] },
  ['ch-foreign-shift'])

// 17. 备案项目方案变更不涉及人遗 -> 书面说明
check('备案:方案变更书面说明',
  { _flow: 'existing', ch_track: 'filing_trial', ch_unit_foreign: 'no', ch_convert: 'none', ch_items_filing: ['plan_no_hgr'] },
  ['ch-filing-notice'])

// 18. 多中心提示
check('多中心提示',
  { unit_type: 'chinese', resource_kind: 'material_only', material_type: ['whole_blood'], activities: ['coop'], coop_multicenter: 'yes', coop_role: 'substantial', coop_purpose: 'yes', coop_insite: 'yes', coop_exploratory: 'no' },
  ['coop-filing', 'coop-multicenter'])

// 19. 流程隔离：existing 不出现 unit_type 题
{
  const qs2 = visibleQuestions({ _flow: 'existing' }).map((q) => q.id)
  if (!qs2.includes('unit_type') && qs2.includes('ch_track')) { pass++; console.log('PASS 变更流程题目隔离') } else { fail++; console.log('FAIL 流程隔离') }
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
