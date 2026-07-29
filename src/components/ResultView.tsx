import type { Conclusion, ConclusionType, Confidence } from '../rules/types'
import type { EvalResult } from '../rules/evaluate'
import type { Answers } from '../rules/types'
import { exportReportDocx } from '../utils/exportDocx'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  FileCheck2,
  FileDown,
  FileText,
  FlagTriangleRight,
  Printer,
  RotateCcw,
  Scale,
  ShieldAlert,
  UserRound,
} from 'lucide-react'

const TYPE_META: Record<ConclusionType, { label: string; cls: string; icon: React.ReactNode }> = {
  prohibited: { label: '禁止事项', cls: 'border-red-300 bg-red-50', icon: <Ban className="h-5 w-5 text-red-600" /> },
  'security-review': { label: '安全审查', cls: 'border-orange-300 bg-orange-50', icon: <ShieldAlert className="h-5 w-5 text-orange-600" /> },
  approval: { label: '行政许可', cls: 'border-rose-200 bg-rose-50', icon: <Scale className="h-5 w-5 text-rose-600" /> },
  filing: { label: '备案', cls: 'border-blue-200 bg-blue-50', icon: <FileCheck2 className="h-5 w-5 text-blue-600" /> },
  report: { label: '事先报告', cls: 'border-violet-200 bg-violet-50', icon: <FileText className="h-5 w-5 text-violet-600" /> },
  exempt: { label: '无需申报 / 豁免', cls: 'border-emerald-200 bg-emerald-50', icon: <FlagTriangleRight className="h-5 w-5 text-emerald-600" /> },
  notice: { label: '合规提示', cls: 'border-slate-200 bg-slate-50', icon: <AlertTriangle className="h-5 w-5 text-slate-500" /> },
}

const CONF_META: Record<Confidence, { label: string; cls: string }> = {
  A: { label: 'A · 法规条文', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  B: { label: 'B · 官方解答口径', cls: 'bg-sky-100 text-sky-800 border-sky-200' },
  C: { label: 'C · 实践惯例', cls: 'bg-stone-100 text-stone-700 border-stone-200' },
}

function ConclusionCard({ c }: { c: Conclusion }) {
  const meta = TYPE_META[c.type]
  return (
    <div className={`rounded-2xl border p-5 ${meta.cls} break-inside-avoid`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{meta.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-white/70 text-xs">{meta.label}</Badge>
            {c.citations.map((ci, i) => (
              <Badge key={i} variant="outline" className={`text-[10px] ${CONF_META[ci.confidence].cls}`}>
                {CONF_META[ci.confidence].label}
              </Badge>
            ))}
          </div>
          <h3 className="mt-2 text-base font-semibold leading-6 text-slate-900">{c.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{c.summary}</p>

          {c.reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.reasons.map((r, i) => (
                <span key={i} className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200">
                  {r}
                </span>
              ))}
            </div>
          )}

          {c.citations.length > 0 && (
            <div className="mt-3 rounded-lg bg-white/60 p-3">
              <p className="mb-1 text-xs font-semibold text-slate-600">依据条款</p>
              <ul className="space-y-1">
                {c.citations.map((ci, i) => (
                  <li key={i} className="text-xs leading-5 text-slate-600">
                    <span className="font-medium">{ci.source}</span> {ci.article}
                    {ci.note && <span className="block pl-3 text-[11px] text-slate-400">※ {ci.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.obligations.length > 0 && (
            <div className="mt-3">
              <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-slate-700">
                <CalendarClock className="h-3.5 w-3.5" /> 后续义务与时限
              </p>
              <ul className="space-y-1.5">
                {c.obligations.map((ob, i) => (
                  <li key={i} className="rounded-lg bg-white/60 px-3 py-2 text-xs leading-5 text-slate-700">
                    <span className="font-medium">{ob.title}</span>
                    <span className="block text-slate-500">{ob.deadline}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.risk && (
            <div className="mt-3 flex gap-2 rounded-lg border border-red-200 bg-red-50/80 p-3 text-xs leading-5 text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{c.risk}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResultView({ result, answers, onRestart }: { result: EvalResult; answers: Answers; onRestart: () => void }) {
  const unitLabel =
    result.unitType === 'chinese' ? '中方单位' : result.unitType === 'foreign' ? '外方单位' : '性质待定（需人工判定）'
  const hasAction = result.conclusions.some((c) => ['prohibited', 'security-review', 'approval', 'filing', 'report'].includes(c.type))

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24">
      {/* 报告头 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500">人类遗传资源申报备案评估报告（原型）</p>
            <h2 className={`mt-1 text-xl font-bold ${hasAction ? 'text-rose-700' : 'text-emerald-700'}`}>
              {hasAction ? '存在需要办理的申报 / 审批事项' : '现有信息下无强制申报事项'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-600">
              <Badge variant="secondary">单位性质：{unitLabel}</Badge>
              <Badge variant="secondary">受监管材料：{result.regulatedMaterial ? '涉及' : '不涉及'}</Badge>
              <Badge variant="secondary">受监管信息：{result.regulatedInfo ? '涉及' : '不涉及'}</Badge>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 print:hidden">
            <Button size="sm" onClick={() => void exportReportDocx(result, answers)}>
              <FileDown className="mr-1 h-4 w-4" /> 导出 Word 报告
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="mr-1 h-4 w-4" /> 打印 / PDF
            </Button>
            <Button size="sm" variant="ghost" onClick={onRestart}>
              <RotateCcw className="mr-1 h-4 w-4" /> 重新评估
            </Button>
          </div>
        </div>
        {/* 置信度图例 */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
          <span className="font-medium">结论置信度分级：</span>
          {(['A', 'B', 'C'] as Confidence[]).map((k) => (
            <Badge key={k} variant="outline" className={CONF_META[k].cls}>{CONF_META[k].label}</Badge>
          ))}
          <span>B / C 级结论非法规条文原文，重大决策前请核对原文或咨询主管部门。</span>
        </div>
      </div>

      {/* 灰色地带：转人工 */}
      {result.grayAreas.length > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <UserRound className="h-5 w-5" /> 以下问题超出规则覆盖范围，建议转人工咨询
          </h3>
          <ul className="mt-3 space-y-2">
            {result.grayAreas.map((g, i) => (
              <li key={i} className="rounded-lg bg-white/70 p-3 text-xs leading-5 text-amber-900">
                <span className="font-semibold">{g.question}</span>（您的回答：{g.answer}）
                <span className="block text-amber-700">{g.advice}</span>
              </li>
            ))}
          </ul>
          <Button size="sm" className="mt-3 bg-amber-600 text-white hover:bg-amber-700">
            预约人工合规咨询 →
          </Button>
        </div>
      )}

      {/* 结论列表 */}
      <div className="mt-4 space-y-4">
        {result.conclusions.map((c) => (
          <ConclusionCard key={c.id} c={c} />
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] leading-5 text-slate-400">
        本报告由规则引擎基于《人类遗传资源管理条例》（2024 修订）及其实施细则、主管部门常见问题解答自动生成，
        受理机关统一按现行口径表述为国家卫生健康委员会（原科技部相关职责已划转）。
        本工具为产品原型，结论不构成法律意见。
      </p>
    </div>
  )
}
