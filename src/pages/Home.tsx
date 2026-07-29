import { useState } from 'react'
import Wizard from '../components/Wizard'
import ResultView from '../components/ResultView'
import { evaluate } from '../rules/evaluate'
import { visibleQuestions } from '../rules/questions'
import type { Answers } from '../rules/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, ClipboardList, Dna, FlaskConical, ShieldCheck } from 'lucide-react'

type Stage = 'intro' | 'wizard' | 'result'
type Role = 'compliance' | 'researcher' | null

export default function Home() {
  const [stage, setStage] = useState<Stage>('intro')
  const [role, setRole] = useState<Role>(null)
  const [answers, setAnswers] = useState<Answers>({})
  const [currentId, setCurrentId] = useState<string | null>(null)

  const start = (r: Role, flow: 'new' | 'existing' = 'new') => {
    setRole(r)
    setAnswers({ _flow: flow })
    const first = visibleQuestions({ _flow: flow })[0]
    setCurrentId(first?.id ?? null)
    setStage('wizard')
  }

  const onAnswer = (id: string, value: string | string[]) => {
    setAnswers((prev) => {
      const next = { ...prev, [id]: value }
      // 剪除因分支变化而不再出现的题目答案（保留 _ 开头的流程控制字段）
      const keep = new Set(visibleQuestions(next).map((q) => q.id))
      for (const k of Object.keys(next)) {
        if (!keep.has(k) && k !== id && !k.startsWith('_')) delete next[k]
      }
      return next
    })
  }

  const restart = () => {
    setAnswers({})
    setStage('intro')
    setRole(null)
    setCurrentId(null)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* 顶栏 */}
      <header className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
              <Dna className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-4">人遗申报备案评估工具</h1>
              <p className="text-[11px] text-slate-500">人类遗传资源行政许可 / 备案 / 事先报告智能评估（原型）</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700">条例 2024 修订</Badge>
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700">实施细则 2023</Badge>
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700">FAQ 2023.09</Badge>
          </div>
        </div>
      </header>

      {stage === 'intro' && (
        <main className="mx-auto max-w-3xl px-4 py-14">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">10 余道问题，判断你的项目<br />需要哪条人遗申报路径</h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-600">
              基于"身份 → 资源 → 活动 → 触发与豁免"四层决策漏斗，覆盖采集许可、保藏许可、国际合作审批 / 临床试验备案、
              材料出境审批、信息对外提供事先报告与安全审查全部轨道，逐条结论标注法规依据与置信度。
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <button
              onClick={() => start('compliance')}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md"
            >
              <Building2 className="h-8 w-8 text-indigo-600" />
              <h3 className="mt-3 text-base font-semibold">企业合规 / 注册人员</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                新项目完整评估：逐层问卷 + 含条款引用、后续义务时限、罚则提示的评估报告，可导出 Word 留痕。
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-indigo-600 group-hover:underline">开始完整评估 →</span>
            </button>
            <button
              onClick={() => start('researcher')}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-teal-400 hover:shadow-md"
            >
              <FlaskConical className="h-8 w-8 text-teal-600" />
              <h3 className="mt-3 text-base font-semibold">研究者 / BD</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                新项目快速判断：同一套规则引擎，答完关键问题即可随时跳到结论，先看"要不要报、报哪条"。
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-teal-600 group-hover:underline">开始快速判断 →</span>
            </button>
            <button
              onClick={() => start('compliance', 'existing')}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:border-amber-400 hover:shadow-md"
            >
              <ClipboardList className="h-8 w-8 text-amber-600" />
              <h3 className="mt-3 text-base font-semibold">已获批项目管理</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                变更 / 延续 / 报告评估：判断变更要审批、备案变更还是书面说明，含备案转许可、多中心、合作方变外方等情形。
              </p>
              <span className="mt-4 inline-block text-sm font-medium text-amber-600 group-hover:underline">评估变更义务 →</span>
            </button>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-xs leading-5 text-slate-500">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
            <p>
              规则依据：《中华人民共和国人类遗传资源管理条例》（2024 修订）、《人类遗传资源管理条例实施细则》（2023）、
              《人类遗传资源管理常见问题解答》（2023.09）。受理机关按现行口径统一为国家卫生健康委员会
              （2023 年机构改革后相关职责自科技部划转）。结论按"法规条文 / 官方解答口径 / 实践惯例"三级标注置信度；
              规则覆盖不到的灰色地带将提示转人工咨询。本工具为产品原型，不构成法律意见。
            </p>
          </div>
        </main>
      )}

      {stage === 'wizard' && (
        <main className="py-8">
          {role === 'researcher' && Object.keys(answers).length >= 2 && (
            <div className="mx-auto mb-4 flex max-w-3xl justify-end px-4">
              <Button size="sm" variant="outline" className="border-teal-600 text-teal-700" onClick={() => setStage('result')}>
                直接查看当前结论 →
              </Button>
            </div>
          )}
          <Wizard
            answers={answers}
            currentId={currentId}
            onAnswer={onAnswer}
            onNavigate={setCurrentId}
            onFinish={() => setStage('result')}
          />
        </main>
      )}

      {stage === 'result' && (
        <main className="py-8">
          <ResultView result={evaluate(answers)} answers={answers} onRestart={restart} />
        </main>
      )}
    </div>
  )
}
